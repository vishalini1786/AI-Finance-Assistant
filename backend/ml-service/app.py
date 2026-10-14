from pathlib import Path
import pickle
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi import File, UploadFile
from pydantic import BaseModel, Field

MODEL_DIR = Path(__file__).resolve().parent / "models"
app = FastAPI(title="FinMan ML Service", version="1.0.0")


def load_model(filename: str) -> Any:
    path = MODEL_DIR / filename
    if not path.exists():
        raise RuntimeError(f"Required model file is missing: {filename}")
    with path.open("rb") as handle:
        return pickle.load(handle)


class PredictionRequest(BaseModel):
    features: list[Any] = None
    feature_dict: dict = None

@app.get("/health")
def health():
    return {
        "status": "ok",
        "regressor_available": (MODEL_DIR / "finman_expense_regressor.pkl").exists(),
        "classifier_available": (MODEL_DIR / "finman_category_classifier.pkl").exists(),
        "metadata_available": (MODEL_DIR / "finman_model_metadata.pkl").exists(),
    }


@app.post("/predict/expense")
def predict_expense(request: PredictionRequest):
    try:
        import pandas as pd
        model = load_model("finman_expense_regressor.pkl")
        meta = load_model("finman_model_metadata.pkl")
        if request.feature_dict:
            df = pd.DataFrame([request.feature_dict])
            for f in meta['regression_features']:
                if f not in df.columns:
                    df[f] = 0.0
            df = df[meta['regression_features']]
            prediction = model.predict(df)
        else:
            prediction = model.predict([request.features])
        return {"prediction": float(prediction[0])}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Expense forecast is unavailable") from exc


@app.post("/predict/category")
def predict_category(request: PredictionRequest):
    try:
        import pandas as pd
        model = load_model("finman_category_classifier.pkl")
        meta = load_model("finman_model_metadata.pkl")
        if request.feature_dict:
            df = pd.DataFrame([request.feature_dict])
            for f in meta['classification_features']:
                if f not in df.columns:
                    df[f] = 0.0 if f not in ['payment_mode_clean', 'location_clean', 'notes_clean'] else ""
            df = df[meta['classification_features']]
            prediction = model.predict(df)
        else:
            prediction = model.predict([request.features])
        return {"category": str(prediction[0])}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Category prediction is unavailable") from exc


@app.post("/ocr/receipt")
async def ocr_receipt(file: UploadFile = File(...)):
    try:
        from io import BytesIO
        from PIL import Image, ImageOps, ImageFilter
        import pytesseract

        if file.content_type == "application/pdf":
            raise RuntimeError("PDF OCR requires a configured PDF rasterizer")
        image = Image.open(BytesIO(await file.read())).convert("L")
        image = ImageOps.autocontrast(image.resize((image.width * 2, image.height * 2)))
        image = image.filter(ImageFilter.SHARPEN)
        text = pytesseract.image_to_string(image)
        import re
        from datetime import datetime

        amount_match = re.search(r'(?:Total|Amount|Rs\.?|INR|,1)\s*:?\s*([\d,]+\.\d{2})', text, re.IGNORECASE)
        amount = float(amount_match.group(1).replace(',', '')) if amount_match else None

        date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', text)
        date_str = None
        if date_match:
            try:
                d = date_match.group(1).replace('-', '/')
                date_str = datetime.strptime(d, "%d/%m/%Y").strftime("%Y-%m-%d")
            except ValueError:
                pass
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        merchant = lines[0] if lines else None

        return {"raw_text": text, "amount": amount, "date": date_str, "merchant": merchant, "confidence": 0.9}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="OCR service is unavailable") from exc
