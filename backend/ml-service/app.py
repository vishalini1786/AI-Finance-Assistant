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
    features: list[Any] = Field(min_length=1)


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
        model = load_model("finman_expense_regressor.pkl")
        prediction = model.predict([request.features])
        return {"prediction": float(prediction[0])}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Expense forecast is unavailable") from exc


@app.post("/predict/category")
def predict_category(request: PredictionRequest):
    try:
        model = load_model("finman_category_classifier.pkl")
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
        return {"raw_text": text, "amount": None, "date": None, "merchant": None, "confidence": None}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="OCR service is unavailable") from exc
