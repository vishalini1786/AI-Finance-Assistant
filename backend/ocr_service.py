"""
FinMan OCR Service with Tesseract 5.x + Advanced Preprocessing
====================================================================
Provides:
  POST /ocr/receipt  -- preprocesses image, runs multi-variant Tesseract OCR,
                        extracts merchant/amount/date, returns structured JSON.

Preprocessing Variants:
  A: Grayscale + CLAHE contrast
  B: Grayscale + Adaptive threshold
  C: Grayscale + Otsu threshold
  D: Upscale + Sharpen + Adaptive threshold

Best variant chosen by combined OCR confidence score.
"""

import os
import re
import io
import logging
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

# ---- Try importing optional OCR deps ----
try:
    import pytesseract
    from PIL import Image, ImageFilter, ImageEnhance, ImageOps
    import cv2
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logging.warning("pytesseract/Pillow/cv2 not installed. OCR will be unavailable.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FinMan ML Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =====================================================================
# MERCHANT / CATEGORY KEYWORD RULES
# =====================================================================

CATEGORY_KEYWORDS = {
    "Fuel": ["petrol", "diesel", "fuel", "indian oil", "bpcl", "hpcl", "iocl", "shell", "gas station", "filling station", "hp petrol"],
    "Medical": ["pharmacy", "medicine", "apollo", "medical", "hospital", "clinic", "health", "dr.", "doctor", "lab", "diagnostic", "chemist", "tablet", "capsule", "syrup"],
    "Food": ["restaurant", "hotel", "cafe", "biryani", "meals", "lunch", "dinner", "breakfast", "tea", "coffee", "swiggy", "zomato", "food"],
    "Electricity": ["tneb", "bescom", "electricity", "electric", "power", "eb bill", "energy", "watt", "units consumed"],
    "Water": ["water", "tanker", "bwssb", "water board"],
    "Internet": ["broadband", "fiber", "jio", "airtel fiber", "bsnl", "internet", "wifi"],
    "Mobile": ["recharge", "mobile", "sim", "jio", "airtel", "vi ", "vodafone", "bsnl", "prepaid", "postpaid"],
    "Transport": ["bus", "auto", "metro", "train", "ola", "uber", "rapido", "taxi", "cab"],
    "Shopping": ["supermarket", "mart", "dmart", "reliance", "big bazaar", "star bazaar", "kirana", "store"],
    "Education": ["school", "college", "university", "tuition", "institute", "course", "education", "fees", "library"],
    "Insurance": ["insurance", "lic", "premium", "policy", "term plan"],
    "EMI": ["emi", "loan", "installment", "repayment", "hdfc loan", "sbi loan"],
    "Entertainment": ["movie", "cinema", "netflix", "amazon prime", "hotstar", "concert", "theatre", "pvr", "inox"],
    "Dining": ["restaurant", "dine", "biryani", "pizza", "burger", "kfc", "mcdonalds", "dominos"],
    "Travel": ["flight", "train ticket", "irctc", "railway", "air ticket", "goair", "indigo", "spicejet", "hotel booking", "makemytrip", "cleartrip"],
}

# =====================================================================
# IMAGE PREPROCESSING
# =====================================================================

def pil_to_cv(pil_img):
    return cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)

def cv_to_pil(cv_img):
    rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

def preprocess_variant_a(pil_img):
    """Grayscale + CLAHE contrast enhancement"""
    cv_img = pil_to_cv(pil_img)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return Image.fromarray(enhanced)

def preprocess_variant_b(pil_img):
    """Grayscale + Gaussian blur + Adaptive threshold"""
    cv_img = pil_to_cv(pil_img)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10
    )
    return Image.fromarray(thresh)

def preprocess_variant_c(pil_img):
    """Grayscale + Otsu threshold"""
    cv_img = pil_to_cv(pil_img)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return Image.fromarray(thresh)

def preprocess_variant_d(pil_img):
    """Upscale 2x + Sharpen + Adaptive threshold — for low-res receipts"""
    w, h = pil_img.size
    upscaled = pil_img.resize((w * 2, h * 2), Image.LANCZOS)
    cv_img = pil_to_cv(upscaled)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(gray, -1, kernel)
    thresh = cv2.adaptiveThreshold(
        sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    return Image.fromarray(thresh)

def deskew(pil_img):
    """Deskew image using Hough transform"""
    try:
        cv_img = pil_to_cv(pil_img)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)
        if lines is not None:
            angles = []
            for rho, theta in lines[:, 0]:
                angle = (theta * 180 / np.pi) - 90
                if abs(angle) < 15:
                    angles.append(angle)
            if angles:
                median_angle = np.median(angles)
                (h, w) = cv_img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                rotated = cv2.warpAffine(cv_img, M, (w, h), flags=cv2.INTER_CUBIC,
                                         borderMode=cv2.BORDER_REPLICATE)
                return cv_to_pil(rotated)
    except Exception:
        pass
    return pil_img

def run_ocr_variant(img, psm=6):
    """Run Tesseract with LSTM engine and return (text, confidence)"""
    config = f"--oem 1 --psm {psm}"
    try:
        data = pytesseract.image_to_data(img, config=config, output_type=pytesseract.Output.DICT)
        words = [w for w in data['text'] if w.strip()]
        confs = [c for c, w in zip(data['conf'], data['text']) if w.strip() and c > 0]
        text = pytesseract.image_to_string(img, config=config)
        avg_conf = sum(confs) / len(confs) if confs else 0
        return text.strip(), avg_conf
    except Exception as e:
        logger.warning(f"OCR variant failed: {e}")
        return "", 0

# =====================================================================
# FINANCIAL FIELD EXTRACTION
# =====================================================================

AMOUNT_LABELS = re.compile(
    r'(?:grand\s*total|total\s*amount|amount\s*payable|net\s*total|balance\s*due|amount\s*due|total|amount|bill\s*amount)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)',
    re.IGNORECASE | re.MULTILINE
)

CURRENCY_BARE = re.compile(r'(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE)

DATE_PATTERNS = [
    (re.compile(r'\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b'), 'DD/MM/YYYY'),
    (re.compile(r'\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b'), 'YYYY-MM-DD'),
    (re.compile(r'\b(\d{2})[\/\-](\d{2})[\/\-](\d{2})\b'), 'DD/MM/YY'),
]

def extract_amount(text):
    """
    Prioritize TOTAL/GRAND TOTAL labels.
    Returns the largest labelled amount, or the largest currency value.
    """
    matches = AMOUNT_LABELS.findall(text)
    if matches:
        amounts = []
        for m in matches:
            try:
                amounts.append(float(m.replace(',', '')))
            except Exception:
                pass
        if amounts:
            return max(amounts)

    # fallback: find all ₹/Rs amounts and return the largest
    bare = CURRENCY_BARE.findall(text)
    if bare:
        try:
            return max(float(v.replace(',', '')) for v in bare)
        except Exception:
            pass

    # fallback: find standalone 4+ digit numbers (likely amounts)
    numbers = re.findall(r'\b(\d{3,7}(?:\.\d{1,2})?)\b', text)
    if numbers:
        candidates = [float(n) for n in numbers if float(n) > 10]
        if candidates:
            return max(candidates)

    return None

def extract_date(text):
    """Return YYYY-MM-DD or None"""
    for pattern, fmt in DATE_PATTERNS:
        m = pattern.search(text)
        if m:
            try:
                if fmt == 'DD/MM/YYYY':
                    d, mo, y = m.group(1), m.group(2), m.group(3)
                    return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
                elif fmt == 'YYYY-MM-DD':
                    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                elif fmt == 'DD/MM/YY':
                    d, mo, y = m.group(1), m.group(2), m.group(3)
                    full_year = f"20{y}" if int(y) < 50 else f"19{y}"
                    return f"{full_year}-{mo.zfill(2)}-{d.zfill(2)}"
            except Exception:
                continue
    return None

def extract_merchant(text):
    """
    Merchant is often in the top lines of the receipt.
    Skip lines that look like phone numbers, addresses, or labels.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    skip_patterns = re.compile(
        r'^(?:\d{10}|ph|phone|tel|address|gst|gstin|tin|date|time|bill|invoice|\d+)', re.IGNORECASE
    )
    for line in lines[:6]:
        if len(line) >= 4 and not skip_patterns.match(line) and not re.match(r'^\W+$', line):
            return line[:150]
    return lines[0][:150] if lines else None

def classify_category(text):
    """Keyword-based category classification."""
    lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score:
            scores[cat] = score
    if scores:
        best = max(scores, key=scores.get)
        confidence = min(0.5 + scores[best] * 0.15, 0.97)
        return best, round(confidence * 100, 1)
    return None, 0.0

# =====================================================================
# ENDPOINT
# =====================================================================

@app.post("/ocr/receipt")
async def ocr_receipt(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "OCR dependencies not installed. "
                "Please install: pip install pytesseract Pillow opencv-python-headless\n"
                "And install Tesseract 5.x from: https://github.com/UB-Mannheim/tesseract/wiki"
            )
        )

    # Read uploaded file
    content = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        # Remove alpha
        if pil_img.mode in ('RGBA', 'LA'):
            bg = Image.new('RGB', pil_img.size, (255, 255, 255))
            bg.paste(pil_img, mask=pil_img.split()[-1])
            pil_img = bg
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    # Deskew
    pil_img = deskew(pil_img)

    # Run all 4 preprocessing variants
    variants = []
    try:
        variants.append(run_ocr_variant(preprocess_variant_a(pil_img), psm=6))
        variants.append(run_ocr_variant(preprocess_variant_b(pil_img), psm=6))
        variants.append(run_ocr_variant(preprocess_variant_c(pil_img), psm=6))
        variants.append(run_ocr_variant(preprocess_variant_d(pil_img), psm=4))
        # Also try original grayscale PSM=3 (auto)
        gray = ImageOps.grayscale(pil_img)
        variants.append(run_ocr_variant(gray, psm=3))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}")

    # Pick best variant by confidence, break ties by text length
    best_text, best_conf = max(variants, key=lambda v: (v[1], len(v[0])))

    logger.info(f"OCR best confidence: {best_conf:.1f}%, text length: {len(best_text)}")

    if not best_text.strip():
        return {
            "status": "FAILED",
            "message": "OCR could not extract any text. Image may be too blurry or empty.",
            "raw_text": "",
            "confidence": 0,
        }

    # Extract fields
    amount = extract_amount(best_text)
    date_str = extract_date(best_text)
    merchant = extract_merchant(best_text)
    category, cat_conf = classify_category(best_text)

    # Warn if confidence is low
    review_required = best_conf < 65 or amount is None

    return {
        "status": "COMPLETED",
        "raw_text": best_text,
        "confidence": round(best_conf, 1),
        "amount": amount,
        "date": date_str,
        "merchant": merchant,
        "suggested_category": category,
        "category_confidence": cat_conf,
        "review_required": review_required,
        "message": (
            "Some details could not be read confidently. Please review."
            if review_required else
            "Receipt processed successfully."
        ),
    }

# =====================================================================
# Keep existing ML prediction endpoints (from your existing ml_service.py)
# The OCR endpoint is ADDITIVE — do not remove any existing prediction routes.
# =====================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
