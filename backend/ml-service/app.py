from pathlib import Path
import pickle
import importlib.util
import logging
import io
import os
import re
import shutil
from datetime import datetime
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Optional OCR & Image Libraries
try:
    import pytesseract
    from PIL import Image, ImageOps, ImageFilter
except ImportError as err:
    pytesseract = None
    Image = None
    ImageOps = None
    ImageFilter = None
    logger.warning("OCR dependencies are unavailable: %s", type(err).__name__)

try:
    import cv2
except ImportError:
    cv2 = None

OCR_AVAILABLE = pytesseract is not None and Image is not None
if pytesseract is not None:
    backend_root = Path(__file__).resolve().parent.parent
    local_bin = backend_root / "tesseract-bin" / "tesseract.exe"
    local_tessdata = backend_root / "tesseract-bin" / "tessdata"

    env_cmd = os.environ.get("TESSERACT_CMD")
    if env_cmd and Path(env_cmd).is_file():
        pytesseract.pytesseract.tesseract_cmd = env_cmd
    elif os.path.isfile(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    elif local_bin.is_file():
        pytesseract.pytesseract.tesseract_cmd = str(local_bin)
        if "TESSDATA_PREFIX" not in os.environ and local_tessdata.is_dir():
            os.environ["TESSDATA_PREFIX"] = str(local_tessdata)
    elif shutil.which("tesseract"):
        pytesseract.pytesseract.tesseract_cmd = "tesseract"
    else:
        for standard_path in [
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        ]:
            if os.path.isfile(standard_path):
                pytesseract.pytesseract.tesseract_cmd = standard_path
                break

    # Ensure TESSDATA_PREFIX is configured if tessdata exists
    if "TESSDATA_PREFIX" not in os.environ:
        for tc in [
            Path(r"C:\Program Files\Tesseract-OCR\tessdata"),
            local_tessdata,
            Path(r"C:\Program Files (x86)\Tesseract-OCR\tessdata"),
        ]:
            if tc.is_dir() and (tc / "eng.traineddata").is_file():
                os.environ["TESSDATA_PREFIX"] = str(tc)
                break

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_PDF_PAGES = 20
MIME_FORMATS = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/pjpeg": "jpeg",
    "image/jfif": "jpeg",
    "image/pjp": "jpeg",
    "image/png": "png",
    "image/x-png": "png",
    "image/apng": "png",
    "application/pdf": "pdf",
    "application/x-pdf": "pdf",
    "application/acrobat": "pdf",
}
EXTENSION_FORMATS = {
    ".jpg": "jpeg",
    ".jpeg": "jpeg",
    ".jfif": "jpeg",
    ".pjpeg": "jpeg",
    ".pjp": "jpeg",
    ".png": "png",
    ".pdf": "pdf",
}

def is_tesseract_available() -> bool:
    if not OCR_AVAILABLE:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def is_english_language_available() -> bool:
    if not is_tesseract_available():
        return False
    try:
        return "eng" in pytesseract.get_languages(config="")
    except Exception:
        return False

def detect_document_format(filename: str, content_type: str, content: bytes) -> str:
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File size exceeds the 10MB upload limit.")

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        detected = "png"
    elif content.startswith(b"\xff\xd8\xff"):
        detected = "jpeg"
    elif content[:1024].find(b"%PDF-") >= 0:
        detected = "pdf"
    else:
        raise HTTPException(status_code=400, detail="The file contents are not a supported PNG, JPG/JPEG, or PDF document.")

    extension = Path(filename or "").suffix.lower().strip()
    extension_format = EXTENSION_FORMATS.get(extension)
    mime = (content_type or "").split(";", 1)[0].strip().lower()
    mime_format = MIME_FORMATS.get(mime)
    generic_mime = mime in {"", "application/octet-stream", "binary/octet-stream", "image/*"}

    if extension and extension_format and extension_format != detected:
        raise HTTPException(status_code=400, detail="The file extension does not match its contents.")
    if mime_format and mime_format != detected:
        raise HTTPException(status_code=400, detail="The file type does not match its contents.")
    if not mime_format and not generic_mime and not extension_format:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a PNG, JPG/JPEG, or PDF document.")

    return detected

MODEL_DIR = Path(__file__).resolve().parent / "models"
app = FastAPI(title="FinMan Unified ML & OCR Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_model(filename: str) -> Any:
    path = MODEL_DIR / filename
    if not path.exists():
        raise RuntimeError(f"Required model file is missing: {filename}")
    with path.open("rb") as handle:
        return pickle.load(handle)

class PredictionRequest(BaseModel):
    features: Optional[list[Any]] = None
    feature_dict: Optional[dict] = None

@app.get("/health")
def health():
    return {
        "status": "ok",
        "regressor_available": (MODEL_DIR / "finman_expense_regressor.pkl").exists(),
        "classifier_available": (MODEL_DIR / "finman_category_classifier.pkl").exists(),
        "metadata_available": (MODEL_DIR / "finman_model_metadata.pkl").exists(),
        "ocr_available": OCR_AVAILABLE,
        "tesseract_available": is_tesseract_available(),
        "english_language_data_available": is_english_language_available(),
        "pdf_text_extraction_available": importlib.util.find_spec("pypdf") is not None,
        "scanned_pdf_renderer_available": importlib.util.find_spec("pypdfium2") is not None,
    }

def get_tesseract_diagnostics() -> dict:
    configured_cmd = getattr(pytesseract.pytesseract, "tesseract_cmd", "tesseract") if pytesseract else None
    version_str = None
    langs = []
    avail = False
    eng_avail = False
    if OCR_AVAILABLE and configured_cmd:
        try:
            version_str = str(pytesseract.get_tesseract_version())
            avail = True
            langs = pytesseract.get_languages(config="")
            eng_avail = "eng" in langs
        except Exception as exc:
            logger.warning("Diagnostics check: %s", exc)
            avail = False

    return {
        "status": "ok" if avail else "degraded",
        "engine_available": avail,
        "tesseract_available": avail,
        "configured_executable": str(configured_cmd) if configured_cmd else None,
        "engine_version": version_str,
        "available_languages": langs,
        "is_english_available": eng_avail,
        "supported_formats": ["png", "jpeg", "pdf"],
        "pdf_text_extraction_available": importlib.util.find_spec("pypdf") is not None,
        "scanned_pdf_renderer_available": importlib.util.find_spec("pypdfium2") is not None,
    }

@app.get("/ocr/diagnostics")
def ocr_diagnostics():
    return get_tesseract_diagnostics()

@app.post("/predict/expense")
def predict_expense(request: PredictionRequest):
    try:
        import pandas as pd
        model = load_model("finman_expense_regressor.pkl")
        meta = load_model("finman_model_metadata.pkl")
        if request.feature_dict:
            df = pd.DataFrame([request.feature_dict])
            for f in meta.get("regression_features", []):
                if f not in df.columns:
                    df[f] = 0.0
            df = df[meta["regression_features"]]
            prediction = model.predict(df)
        elif request.features:
            prediction = model.predict([request.features])
        else:
            raise ValueError("No features provided")
        return {"prediction": float(prediction[0])}
    except Exception as exc:
        logger.error("Expense prediction error: %s", exc)
        raise HTTPException(status_code=503, detail="Expense forecast is unavailable") from exc

@app.post("/predict/category")
def predict_category(request: PredictionRequest):
    try:
        import pandas as pd
        model = load_model("finman_category_classifier.pkl")
        meta = load_model("finman_model_metadata.pkl")
        if request.feature_dict:
            df = pd.DataFrame([request.feature_dict])
            for f in meta.get("classification_features", []):
                if f not in df.columns:
                    df[f] = 0.0 if f not in ["payment_mode_clean", "location_clean", "notes_clean"] else ""
            df = df[meta["classification_features"]]
            prediction = model.predict(df)
        elif request.features:
            prediction = model.predict([request.features])
        else:
            raise ValueError("No features provided")
        return {"category": str(prediction[0])}
    except Exception as exc:
        logger.error("Category prediction error: %s", exc)
        raise HTTPException(status_code=503, detail="Category prediction is unavailable") from exc

# =====================================================================
# OCR & PARSING LOGIC
# =====================================================================

# ---------------------------------------------------------------------------
# CATEGORY KEYWORDS
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "Fuel": ["petrol", "diesel", "fuel", "indian oil", "bpcl", "hpcl", "iocl", "shell", "filling station"],
    "Medical": ["pharmacy", "medicine", "apollo", "medical", "hospital", "clinic", "chemist", "tablet", "syrup"],
    "Food": ["restaurant", "hotel", "cafe", "biryani", "meals", "lunch", "dinner", "breakfast", "swiggy", "zomato", "bakery"],
    "Electricity": ["tneb", "bescom", "electricity", "electric", "power", "eb bill", "energy"],
    "Water": ["water", "tanker", "bwssb", "water board"],
    "Internet": ["broadband", "fiber", "jio fiber", "airtel fiber", "bsnl", "internet", "wifi"],
    "Mobile": ["recharge", "mobile", "sim", "airtel", "vodafone", "vi ", "jio", "prepaid", "postpaid"],
    "Transport": ["bus", "auto", "metro", "train", "ola", "uber", "rapido", "taxi", "toll"],
    "Shopping": ["supermarket", "mart", "dmart", "reliance smart", "big bazaar", "store", "retail", "grocery", "fresh mart", "kirana"],
    "Education": ["school", "college", "university", "tuition", "institute", "course", "fees"],
    "Entertainment": ["movie", "cinema", "pvr", "inox", "netflix", "prime", "hotstar"],
}

DEV_MODE = os.environ.get("FINMAN_DEV_MODE", "true").lower() in ("true", "1", "yes", "dev", "development")

# ---------------------------------------------------------------------------
# IDENTIFIERS & REJECTIONS – Never treat pincodes, phones, bills, or dates as amounts
# ---------------------------------------------------------------------------
_PHONE = re.compile(r'(?:\b[6-9][0-9]{9}\b|\b0[0-9]{2,4}[-\s]?[0-9]{6,8}\b)')
_PINCODE = re.compile(r'\b[1-9][0-9]{5}\b')
_PINCODE_CONTEXT = re.compile(
    r'(?:\b(?:pin|pincode|pin\s*code|postal|zip|zipcode)\b'
    r'|(?:chennai|bangalore|bengaluru|mumbai|delhi|new\s*delhi|hyderabad|kolkata|pune|ahmedabad|jaipur|lucknow|coimbatore|madurai|kochi|noida|gurugram|chandigarh)'
    r'[\s\-–,]+[1-9][0-9]{5}\b)',
    re.IGNORECASE,
)
_REJECT_AMOUNT_CONTEXTS = re.compile(
    r'(?:bill\s*(?:no|number|#)?|invoice\s*(?:no|number|#)?|ref(?:erence)?\s*(?:no|number|#)?|'
    r'order\s*(?:no|number|#)?|gstin?|tin|phone|ph|tel|mobile|contact|'
    r'store\s*id|terminal|cashier|counter|upi\s*ref|utr|rrn|txn\s*id)',
    re.IGNORECASE,
)
_BILL_REF_NUMBER = re.compile(
    r'\b(?:[A-Z]{1,4}-)?(?:20[0-9]{2})-[0-9]{3,6}\b'
    r'|\b[A-Z]{2,5}[0-9]{5,12}\b',
    re.IGNORECASE,
)
_DATE_FRAG = re.compile(r'\b20[0-9]{2}\b|\b[0-3][0-9][/-][01][0-9]\b')

# ---------------------------------------------------------------------------
# LABELED TOTAL PATTERNS – Priority order: grand totals > total > subtotal > amount
# Matches across optional OCR artifacts (~, %, =, -, :, ₹, Rs, INR, newlines)
# ---------------------------------------------------------------------------
_LABELED_TOTAL_PATTERNS = [
    # Rank 0: Grand Total, Total Amount Due / Payable, Final Total, Net Payable
    (0, re.compile(
        r'(?:grand\s*total|total\s*amount(?:\s*(?:payable|paid|due))?|amount\s*(?:payable|paid|due)|net\s*(?:total|payable|amount)|balance\s*due|final\s*(?:total|amount))'
        r'[\s:\-=~%*|]*(?:\n\s*)?(?:₹|rs\.?\s*|inr\s*)?[\s:\-=~%*|]*([0-9,]+(?:\.[0-9]{1,2})?)',
        re.IGNORECASE,
    )),
    # Rank 1: Plain "total" (not followed by items/qty/deductions/earnings)
    (1, re.compile(
        r'(?<!\w)total(?!\s*(?:items?|qty|quantity|units?|pieces?|pcs?|deductions?|earnings?|count))\b'
        r'[\s:\-=~%*|]*(?:\n\s*)?(?:₹|rs\.?\s*|inr\s*)?[\s:\-=~%*|]*([0-9,]+(?:\.[0-9]{1,2})?)',
        re.IGNORECASE,
    )),
    # Rank 2: Subtotal
    (2, re.compile(
        r'(?<!\w)sub\s*total\b[\s:\-=~%*|]*(?:\n\s*)?(?:₹|rs\.?\s*|inr\s*)?[\s:\-=~%*|]*([0-9,]+(?:\.[0-9]{1,2})?)',
        re.IGNORECASE,
    )),
    # Rank 3: Plain amount (excluding words/tax/rate)
    (3, re.compile(
        r'(?<!\w)(?:bill\s*)?amount\b(?!\s*(?:in\s*words|tax|rate|percentage|tendered))\b'
        r'[\s:\-=~%*|]*(?:\n\s*)?(?:₹|rs\.?\s*|inr\s*)?[\s:\-=~%*|]*([0-9,]+(?:\.[0-9]{1,2})?)',
        re.IGNORECASE,
    )),
]

_CURRENCY_BARE = re.compile(
    r'(?:₹\s*|rs\.?\s*|inr\s*)([0-9,]+(?:\.[0-9]{1,2})?)',
    re.IGNORECASE,
)


def _parse_amount(raw: str) -> Optional[float]:
    """Parse a raw amount string like '6,400.00', '640', '640.00' to float. Returns None on failure."""
    try:
        return float(raw.replace(",", ""))
    except (ValueError, AttributeError):
        return None


def _is_plausible_amount(value: float) -> bool:
    """An amount must be in a sensible real-world transaction range for a receipt."""
    return 0.5 <= value <= 9_99_999


def _reject_if_identifier(raw_num_str: str, context_line: str) -> bool:
    """Return True if this number looks like a bill ID, phone number, pincode, or date fragment."""
    # Phone numbers
    if _PHONE.search(raw_num_str) or _PHONE.search(context_line):
        return True
    # Context contains bill/ref/cashier/terminal keywords
    if _REJECT_AMOUNT_CONTEXTS.search(context_line or ""):
        return True
    # Indian postal code / PIN code in context
    if _PINCODE_CONTEXT.search(context_line or ""):
        return True
    # Bill/ref patterns like GB-2026-10482
    if _BILL_REF_NUMBER.search(raw_num_str) or _BILL_REF_NUMBER.search(context_line or ""):
        return True
    # Bare 6-digit integer without decimal in address context is a postal code
    digits_only = re.sub(r'[^0-9]', '', raw_num_str)
    if len(digits_only) == 6 and '.' not in raw_num_str:
        return True
    # Date fragments
    if _DATE_FRAG.fullmatch(raw_num_str):
        return True
    value = _parse_amount(raw_num_str)
    if value is not None and (value < 0.5 or value > 999999):
        return True
    return False


def _extract_item_lines(text: str) -> tuple[list[tuple[str, float]], float, str]:
    """
    Extract item-name / price pairs from the tabular section of the receipt.
    Returns:
        (items, item_sum, description_summary)
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    start_idx = 0
    end_idx = len(lines)

    # Locate table header
    for idx, l in enumerate(lines):
        if re.search(r'\b(?:item(?:\s*name)?|description|particulars)\b', l, re.I) and re.search(r'\b(?:qty|price|amount|rate)\b', l, re.I):
            start_idx = idx + 1
            break
        elif re.search(r'\b(?:bill\s*no|date|time|cashier|terminal|store\s*id)\b', l, re.I):
            start_idx = max(start_idx, idx + 1)

    # Locate table end (totals/payment/footer)
    for idx in range(start_idx, len(lines)):
        l = lines[idx]
        if re.search(r'\b(?:subtotal|total(?!\s*items?)|discount|tax|sgst|cgst|igst|payment|upi|cash|card|thank\s*you)\b', l, re.I):
            end_idx = idx
            break

    items = []
    for l in lines[start_idx:end_idx]:
        if re.search(r'\b(?:total\s*items?|subtotal|discount)\b', l, re.I):
            continue
        # Strip leading serial number or bullets like '1 ', '1. ', 'it ', '2 '
        cleaned = re.sub(r'^(?:[0-9]{1,3}|it|il|[iIl|\(\)\.\-]+)\s+', '', l).strip()
        nums = list(re.finditer(r'(?:[~%₹]|\brs\.?|\binr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\b', cleaned))
        if nums:
            price = float(nums[-1].group(1))
            name_part = cleaned[:nums[0].start()].strip()
            # Clean trailing qty token like 'il', 'it', '1', '2'
            name_clean = re.sub(r'\s+(?:it|il|[0-9iIl]+)$', '', name_part).strip()
            name_clean = re.sub(r'^[^\w\(]+', '', name_clean).strip()
            if len(name_clean) >= 2 and 0.5 <= price <= 50000:
                items.append((name_clean, price))

    item_sum = sum(p for _, p in items) if items else 0.0
    desc_parts = [f"{n} ₹{p:.0f}" if p == int(p) else f"{n} ₹{p:.2f}" for n, p in items[:8]]
    description = "; ".join(desc_parts)
    return items, item_sum, description


def extract_amount(text: str) -> tuple[Optional[float], float, list[dict], str]:
    """
    Extract transaction amount from receipt text.

    Returns:
        (amount, confidence, debug_candidates, description)
    """
    debug: list[dict] = []
    lines = text.split("\n")
    items, item_sum, description = _extract_item_lines(text)

    # --- Pass 1: Labeled totals (highest priority) ---
    for rank, pattern in _LABELED_TOTAL_PATTERNS:
        matches = []
        for m in pattern.finditer(text):
            raw = m.group(1)
            start = m.start()
            context_line = next((l for l in lines if text.find(l) <= start <= text.find(l) + len(l)), "")
            if _reject_if_identifier(raw, context_line):
                continue
            val = _parse_amount(raw)
            if val is not None and _is_plausible_amount(val):
                matches.append({"val": val, "raw": raw, "label": m.group(0)[:40]})
                debug.append({"source": f"labeled_rank{rank}", "value": val, "label": m.group(0)[:40]})

        if matches:
            best = matches[-1]["val"]
            conf = 0.92 if rank == 0 else (0.85 if rank == 1 else 0.75)
            # Item sum validation
            if item_sum > 0 and abs(best - item_sum) <= 0.05:
                conf = 0.98
                debug.append({"source": "item_sum_exact_match", "value": best, "label": f"sum={item_sum}"})
            elif item_sum > 0 and abs(best - item_sum) / max(best, 1) < 0.15:
                conf = max(conf, 0.90)
                debug.append({"source": "item_sum_close_match", "value": best, "label": f"sum={item_sum}"})
            return best, conf, debug, description

    # --- Pass 2: Bare currency-symbol amounts ---
    currency_cands = []
    for m in _CURRENCY_BARE.finditer(text):
        raw = m.group(1)
        start = m.start()
        context_line = next((l for l in lines if text.find(l) <= start <= text.find(l) + len(l)), "")
        if _reject_if_identifier(raw, context_line):
            continue
        val = _parse_amount(raw)
        if val is not None and _is_plausible_amount(val):
            currency_cands.append(val)
            debug.append({"source": "currency_symbol", "value": val, "label": m.group(0)[:20]})

    if currency_cands:
        if item_sum > 0:
            closest = min(currency_cands, key=lambda v: abs(v - item_sum))
            if abs(closest - item_sum) / max(item_sum, 1) < 0.10:
                debug.append({"source": "currency_item_sum_match", "value": closest})
                return closest, 0.88, debug, description
        best = max(currency_cands)
        return best, 0.70, debug, description

    # --- Pass 3: Item sum fallback ---
    if item_sum > 0 and len(items) >= 2:
        debug.append({"source": "item_sum_fallback", "value": item_sum, "label": f"{len(items)} items"})
        return item_sum, 0.75, debug, description

    # --- Pass 4: Conservative raw number fallback ---
    bill_ref_spans = {m.span() for m in _BILL_REF_NUMBER.finditer(text)}
    phone_spans = {m.span() for m in _PHONE.finditer(text)}
    date_frag_spans = {m.span() for m in _DATE_FRAG.finditer(text)}
    pincode_spans = {m.span() for m in _PINCODE.finditer(text)}
    reject_spans = bill_ref_spans | phone_spans | date_frag_spans | pincode_spans

    raw_cands = []
    for m in re.finditer(r'\b([0-9]{1,6}(?:\.[0-9]{1,2})?)\b', text):
        span = m.span()
        if any(rs[0] <= span[0] < rs[1] or rs[0] < span[1] <= rs[1] for rs in reject_spans):
            continue
        raw = m.group(1)
        val = _parse_amount(raw)
        if val is not None and 10 <= val <= 99999:
            context_line = next((l for l in lines if text.find(l) <= m.start() <= text.find(l) + len(l)), "")
            if not _reject_if_identifier(raw, context_line):
                raw_cands.append(val)
                debug.append({"source": "raw_number", "value": val, "label": raw})

    if raw_cands:
        return max(raw_cands), 0.35, debug, description

    return None, 0.0, debug, description


def extract_date(text: str) -> Optional[str]:
    date_patterns = [
        (re.compile(r'\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b'), 'DD/MM/YYYY'),
        (re.compile(r'\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b'), 'YYYY-MM-DD'),
        (re.compile(r'\b(\d{2})[\/\-](\d{2})[\/\-](\d{2})\b'), 'DD/MM/YY'),
    ]
    for pattern, fmt in date_patterns:
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


SALARY_KEYWORDS = [
    "salary", "payslip", "pay slip", "basic pay", "hra", "provident fund",
    "pf", "net pay", "net salary", "take home", "gross pay", "gross earnings",
    "total earnings", "deductions", "employee", "ctc"
]

NET_SALARY_PATTERNS = [
    re.compile(r'(?:net\s*(?:salary|pay|payable|amount)|take\s*home\s*(?:pay)?|amount\s*credited)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE),
]

GROSS_SALARY_PATTERNS = [
    re.compile(r'(?:gross\s*(?:salary|pay|earnings|amount)|total\s*earnings)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE),
]

DEDUCTIONS_PATTERNS = [
    re.compile(r'(?:total\s*deductions?|deductions?)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE),
]


def parse_salary_details(text: str):
    lower = text.lower()
    is_salary = any(k in lower for k in [
        "salary", "payslip", "pay slip", "payroll", "net pay", "gross pay", "total earnings"
    ])
    net_salary = None
    gross_salary = None
    deductions = None

    for pat in NET_SALARY_PATTERNS:
        m = pat.findall(text)
        if m:
            try:
                net_salary = float(m[-1].replace(",", ""))
                break
            except Exception:
                pass

    for pat in GROSS_SALARY_PATTERNS:
        m = pat.findall(text)
        if m:
            try:
                gross_salary = float(m[-1].replace(",", ""))
                break
            except Exception:
                pass

    for pat in DEDUCTIONS_PATTERNS:
        m = pat.findall(text)
        if m:
            try:
                deductions = float(m[-1].replace(",", ""))
                break
            except Exception:
                pass

    if is_salary or (net_salary and gross_salary):
        return {
            "isSalary": True,
            "netSalary": net_salary,
            "grossSalary": gross_salary,
            "deductions": deductions,
        }
    return None


def parse_contract_note(text: str) -> Optional[dict]:
    lower = text.lower()
    is_contract = (
        "contract note" in lower
        or ("sebi" in lower and any(k in lower for k in ["trade date", "settlement date", "brokerage", "equity trading", "isin"]))
    )
    if not is_contract:
        return None

    is_sell = any(k in lower for k in [
        "sell value", "equity sell", "sale proceeds", "amount credited",
        "credited to your account", "credit date", "sell"
    ])
    is_buy = any(k in lower for k in [
        "buy value", "equity buy", "amount debited", "debited from",
        "debit date"
    ]) and not ("sell value" in lower or "equity sell" in lower or "amount credited" in lower)

    # 1. Trade Date & Settlement/Credit Date
    trade_date = None
    m_td = re.search(r'Trade\s*Date[\s\S]{0,100}?(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})', text, re.I)
    if m_td:
        trade_date = extract_date(m_td.group(1))

    settlement_date = None
    m_sd = re.search(r'(?:Settlement|Credit)\s*Date[\s\S]{0,80}?(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})', text, re.I)
    if m_sd:
        settlement_date = extract_date(m_sd.group(1))

    # 2. Symbol & Company / Scrip Name
    symbol = None
    m_sym = re.search(r'\bSymbol\b[\s:+|\-]+([A-Z0-9_\-]+)', text)
    if m_sym and m_sym.group(1).upper() not in {"ISIN", "QUANTITY", "ORDER", "PRICE", "TRADE"}:
        symbol = m_sym.group(1).strip()
    if not symbol:
        m_nar = re.search(r'Narration\s*:\s*([A-Z0-9_\-]+)', text)
        if m_nar:
            symbol = m_nar.group(1).strip()
    if not symbol:
        m_rel = re.search(r'\b(RELIANCE|TCS|INFY|HDFCBANK|ICICIBANK|SBIN|BHARTIARTL|ITC|KOTAKBANK|LT)\b', text)
        if m_rel:
            symbol = m_rel.group(1)

    company = None
    m_comp = re.search(r'\b(?:Scrip Name|Company Name)\b[\s:+|\-]+([A-Z0-9\s.,&\'\-]+?)(?=\s*(?:Client|Symbol|ISIN|Quantity|\n|$))', text, re.I)
    if m_comp:
        company = m_comp.group(1).strip()
    elif symbol and "RELIANCE" in (symbol or ""):
        m_rel_comp = re.search(r'\b(RELIANCE\s+INDUSTRIES\s+LTD)\b', text, re.I)
        if m_rel_comp:
            company = m_rel_comp.group(1).upper()
    if not company and symbol:
        company = symbol

    # 3. Quantity, Price, Gross
    quantity = None
    price_per_share = None
    gross_value = None

    m_table = re.search(r'(?:Sell|Buy)\s*Value\s+(\d+)\s+([0-9,]+\.[0-9]{2})[|\s:\-~]+([0-9,]+\.[0-9]{2})', text, re.I)
    if m_table:
        quantity = int(m_table.group(1))
        price_per_share = float(m_table.group(2).replace(",", ""))
        gross_value = float(m_table.group(3).replace(",", ""))
    else:
        # Fallback inspection of line containing sell/buy value
        for line in text.splitlines():
            if re.search(r'\b(?:Sell|Buy)\s*Value\b', line, re.I):
                dec_nums = [float(n.replace(",", "")) for n in re.findall(r'[0-9,]+\.[0-9]{2}', line)]
                int_nums = [int(n) for n in re.findall(r'\b\d+\b', line)]
                if len(dec_nums) >= 2:
                    price_per_share = min(dec_nums)
                    gross_value = max(dec_nums)
                elif len(dec_nums) == 1:
                    gross_value = dec_nums[0]
                if int_nums:
                    quantity = int_nums[0]
                break

        if not quantity:
            m_qty = re.search(r'\bQuantity\b[\s:\n]*(\d+)', text, re.I)
            if m_qty:
                quantity = int(m_qty.group(1))
        if not price_per_share:
            m_pr = re.search(r'(?:Price|Rate)[^\d\n]*?([0-9,]+\.[0-9]{2})', text, re.I)
            if m_pr:
                price_per_share = float(m_pr.group(1).replace(",", ""))
        if not gross_value:
            m_gv = re.search(r'(?:Sell\s*Value|Gross\s*(?:Amount|Value))[^\d\n]*?([0-9,]+\.[0-9]{2})', text, re.I)
            if m_gv:
                gross_value = float(m_gv.group(1).replace(",", ""))

    # 4. Charges breakdown
    charges_breakdown = {}
    for label, pat in [
        ("brokerage", r'Brokerage[^\d\n]*?([0-9,]+\.[0-9]{2})'),
        ("stt", r'(?:STT|Securities Transaction Tax)[^\d\n]*?([0-9,]+\.[0-9]{2})'),
        ("exchangeCharges", r'Exchange\s*Transaction\s*Charges[^\d\n]*?([0-9,]+\.[0-9]{2})'),
        ("sebiTurnoverFees", r'SEBI\s*Turnover\s*Fees[^\d\n]*?([0-9,]+\.[0-9]{2})'),
        ("stampDuty", r'Stamp\s*Duty[^\d\n]*?([0-9,]+\.[0-9]{2})'),
        ("gst", r'GST[^\d\n]*?([0-9,]+\.[0-9]{2})'),
    ]:
        m_ch = re.search(pat, text, re.I)
        if m_ch:
            charges_breakdown[label] = float(m_ch.group(1).replace(",", ""))

    total_charges = None
    m_tc = re.search(r'Total\s*Charges[^\n]*?([0-9,]+\.[0-9]{2})', text, re.I)
    if m_tc:
        total_charges = float(m_tc.group(1).replace(",", ""))
    elif charges_breakdown:
        total_charges = round(sum(charges_breakdown.values()), 2)

    # 5. Net amount
    net_proceeds = None
    m_net = re.search(r'(?:Net\s*Amount\s*(?:\([^)]*\))?|Amount\s*Credited|Net\s*Pay-?in)[^\n]*?([0-9,]+\.[0-9]{2})', text, re.I)
    if m_net:
        net_proceeds = float(m_net.group(1).replace(",", ""))

    # 6. Arithmetic Verification
    arithmetic_verified = False
    discrepancy_warning = None
    if gross_value is not None and total_charges is not None:
        expected_net = round(gross_value - total_charges, 2)
        if net_proceeds is not None:
            if abs(expected_net - net_proceeds) <= 0.05:
                arithmetic_verified = True
            else:
                discrepancy_warning = (
                    f"Discrepancy: Gross value ({gross_value}) minus total charges ({total_charges}) = "
                    f"{expected_net}, which does not match document net amount ({net_proceeds})."
                )
        else:
            net_proceeds = expected_net

    # 7. Broker / Institution
    broker = None
    m_broker = re.search(r'(GrowInvest(?:\s*Securities(?:\s*Pvt\.?\s*Ltd\.?)?)?)', text, re.I)
    if m_broker:
        broker = "GrowInvest Securities Pvt. Ltd."
    else:
        m_gen = re.search(r'([A-Za-z0-9\s&.,]+(?:Securities|Broking|Capital|Invest|Financial Services)(?:\s*Pvt\.?\s*Ltd\.?)?)', text, re.I)
        if m_gen:
            broker = m_gen.group(1).strip()
        else:
            broker = "GrowInvest"

    amount_to_propose = net_proceeds if net_proceeds is not None else (gross_value or 0.0)
    transaction_type = "EXPENSE" if is_buy else "INCOME"

    desc_parts = []
    if company or symbol:
        desc_parts.append(company or symbol)
    if quantity and price_per_share:
        desc_parts.append(f"({quantity} shares @ ₹{price_per_share:,.2f})")
    desc_parts.append("- Stock sale proceeds credited" if not is_buy else "- Stock purchase")
    description = " ".join(desc_parts)

    profit_note = (
        f"Net sale proceeds: ₹{amount_to_propose:,.2f} credited. "
        "Actual investment profit/loss is unknown without original acquisition cost."
    )

    return {
        "isContractNote": True,
        "documentType": "EQUITY_CONTRACT_NOTE",
        "transactionType": transaction_type,
        "amount": amount_to_propose,
        "date": trade_date or settlement_date,
        "tradeDate": trade_date,
        "settlementDate": settlement_date,
        "merchant": broker,
        "symbol": symbol,
        "company": company,
        "quantity": quantity,
        "pricePerShare": price_per_share,
        "grossSaleValue": gross_value,
        "totalCharges": total_charges,
        "netProceeds": net_proceeds,
        "chargesBreakdown": charges_breakdown,
        "arithmeticVerified": arithmetic_verified,
        "discrepancyWarning": discrepancy_warning,
        "profitNote": profit_note,
        "suggestedCategory": "Investment",
        "description": description,
        "confidence": 0.98 if arithmetic_verified else 0.90,
    }


def parse_dividend_details(text: str) -> Optional[dict]:
    lower = text.lower()
    is_dividend = "dividend" in lower and any(k in lower for k in ["warrant", "tds", "wht", "per share", "interim", "final dividend", "distribution"])
    if not is_dividend:
        return None

    date_str = extract_date(text)
    m_net = re.search(r'(?:net\s*dividend|amount\s*credited|net\s*payable)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)', text, re.I)
    m_gross = re.search(r'(?:gross\s*dividend|total\s*dividend)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)', text, re.I)
    m_tds = re.search(r'(?:tds|tax\s*deducted|withholding)[^\d\n]*?(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)', text, re.I)

    net_amt = float(m_net.group(1).replace(",", "")) if m_net else None
    gross_amt = float(m_gross.group(1).replace(",", "")) if m_gross else None
    tds_amt = float(m_tds.group(1).replace(",", "")) if m_tds else None

    if gross_amt and tds_amt and not net_amt:
        net_amt = round(gross_amt - tds_amt, 2)

    amount = net_amt or gross_amt
    if not amount:
        return None

    return {
        "isDividend": True,
        "documentType": "DIVIDEND_STATEMENT",
        "transactionType": "INCOME",
        "amount": amount,
        "grossAmount": gross_amt,
        "tdsAmount": tds_amt,
        "date": date_str,
        "merchant": extract_merchant(text),
        "suggestedCategory": "Investment",
        "description": "Dividend payment received",
        "confidence": 0.92,
    }


def parse_interest_details(text: str) -> Optional[dict]:
    lower = text.lower()
    is_interest = any(k in lower for k in ["interest certificate", "interest statement", "tds on interest", "interest credited", "interest paid"])
    if not is_interest:
        return None

    date_str = extract_date(text)
    m_int = re.search(r'(?:interest\s*(?:credited|earned)|total\s*interest)[^\n]*?(?:₹|rs\.?|inr)?\s*([0-9,]+\.[0-9]{2})', text, re.I)
    if not m_int:
        m_int = re.search(r'(?:interest\s*(?:credited|earned)|total\s*interest)[^\n]*?(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)', text, re.I)
    if not m_int:
        return None
    amount = float(m_int.group(1).replace(",", ""))
    return {
        "isInterest": True,
        "documentType": "INTEREST_STATEMENT",
        "transactionType": "INCOME",
        "amount": amount,
        "date": date_str,
        "merchant": extract_merchant(text),
        "suggestedCategory": "Investment",
        "description": "Interest income credited",
        "confidence": 0.90,
    }


def extract_merchant(text: str) -> Optional[str]:
    """
    Extract merchant name from the header region of the receipt.
    Strategy:
    1. Look at the first 8 non-empty lines.
    2. Skip lines that are addresses, cities, phone numbers,
       GST/TIN numbers, dates, bill numbers, or very short fragments.
    3. Prefer lines that are ALL-CAPS words (typical store name formatting).
    4. Fall back to the first sensible non-skipped line.
    """
    lines = [re.sub(r'^[|\\/\-*~#\s]+|[|\\/\-*~#\s]+$', '', l).strip() for l in text.split("\n")]
    lines = [l for l in lines if l]

    skip_patterns = re.compile(
        r'^(?:'
        r'\d{10}'                                      # phone number
        r'|ph\b|phone\b|tel\b|address\b|gst\b|gstin\b|tin\b'  # labels
        r'|(?:date|time|bill|invoice|ref|order)\s*(?:no|number|#|:)?'
        r'|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}'         # dates
        r'|[a-z]{1,3}-\d{4}-\d+'                      # bill IDs
        r'|\d+'                                         # pure numbers
        r'|no\.\s*\d+'                                 # door / plot numbers like 'No. 12'
        r'|chennai|bangalore|bengaluru|mumbai|delhi|hyderabad|kolkata|pune'  # city lines
        r'|[^a-zA-Z0-9 &\'.-]{4,}'                     # mostly symbols
        r')',
        re.IGNORECASE,
    )

    all_caps_candidates = []
    first_sensible = None

    for line in lines[:8]:
        if len(line) < 3 or len(line) > 80:
            continue
        if skip_patterns.match(line):
            continue
        digit_ratio = sum(c.isdigit() for c in line) / len(line)
        if digit_ratio > 0.4:
            continue
        # Skip pure address lines containing common address tokens
        if re.search(r'\b(?:main\s*road|street|nagar|lane|floor|avenue|road|opp|near|cross)\b', line, re.I):
            continue
        is_caps = bool(re.match(r'^[A-Z][A-Z &\'.,-]+$', line)) and len(line) >= 4
        if is_caps:
            all_caps_candidates.append(line)
        elif first_sensible is None:
            first_sensible = line

    if all_caps_candidates:
        return all_caps_candidates[0][:150]
    if first_sensible:
        return first_sensible[:150]
    return lines[0][:150] if lines else None


def extract_payment_method(text: str) -> Optional[str]:
    """Detect payment method mentioned in receipt text."""
    lower = text.lower()
    if re.search(r'\b(?:upi|gpay|google\s*pay|phonepe|paytm|bhim)\b', lower):
        return "UPI"
    if re.search(r'\b(?:credit\s*card|visa|mastercard|amex|rupay)\b', lower):
        return "Credit Card"
    if re.search(r'\b(?:debit\s*card)\b', lower):
        return "Debit Card"
    if re.search(r'\b(?:card\s*payment|card\s*ending|pos\b|swipe)\b', lower):
        return "Credit Card"
    if re.search(r'\b(?:net\s*banking|neft|rtgs|imps)\b', lower):
        return "Net Banking"
    if re.search(r'\b(?:cash|paid\s*in\s*cash|change\s*due)\b', lower):
        return "Cash"
    return None


def classify_category(text: str) -> Optional[str]:
    lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score:
            scores[cat] = score
    if scores:
        return max(scores, key=scores.get)
    return None


def preprocess_image(pil_img):
    """Enhanced preprocessing with CLAHE contrast and sharpen filter."""
    try:
        cv_img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        return Image.fromarray(enhanced)
    except Exception:
        img = pil_img.convert("L")
        img = ImageOps.autocontrast(img.resize((img.width * 2, img.height * 2)))
        return img.filter(ImageFilter.SHARPEN)


def extract_text_from_image(pil_image) -> str:
    """
    Extract text using Tesseract with page segmentation tuned for receipts and documents.
    PSM 4 ('Assume a single column of text of variable sizes') preserves header store names,
    tabular columns, and footer totals without dropping headers or fusing sections.
    Falls back to PSM 6 / PSM 3 if PSM 4 yields insufficient text.
    """
    prepped = preprocess_image(pil_image)
    text_psm4 = pytesseract.image_to_string(prepped, config="--psm 4").strip()
    if len(text_psm4) >= 40:
        return text_psm4
    text_psm6 = pytesseract.image_to_string(prepped, config="--psm 6").strip()
    if len(text_psm6) > len(text_psm4):
        return text_psm6
    return text_psm4 or pytesseract.image_to_string(pil_image, config="--psm 3").strip()


def require_tesseract():
    if not OCR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="OCR Python dependencies are unavailable. Install the packages listed in backend/ml-service/requirements.txt.",
        )
    if not is_tesseract_available():
        logger.warning("Tesseract OCR executable is unavailable.")
        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract OCR is not installed or cannot be located. On Windows, install Tesseract 5 "
                "and set TESSERACT_CMD to the full path of tesseract.exe, then restart the OCR service."
            ),
        )
    if not is_english_language_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract English language data (eng.traineddata) is unavailable. Install the English data "
                "in Tesseract's tessdata directory and set TESSDATA_PREFIX to that directory."
            ),
        )


def read_pdf_text(content: bytes) -> str:
    try:
        import pypdf
    except ImportError as exc:
        logger.error("PDF text extraction dependency is unavailable: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="PDF support is unavailable. Install pypdf from backend/ml-service/requirements.txt.",
        ) from exc

    try:
        reader = pypdf.PdfReader(io.BytesIO(content), strict=False)
        if reader.is_encrypted:
            raise HTTPException(status_code=400, detail="Password-protected PDFs are not supported.")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise HTTPException(
                status_code=413,
                detail=f"PDF contains more than the supported {MAX_PDF_PAGES} pages.",
            )
        page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("PDF parsing failed: %s", type(exc).__name__)
        raise HTTPException(status_code=400, detail="The PDF is malformed or could not be read.") from exc

    missing_text_pages = [index for index, text in enumerate(page_texts) if not text]
    if not missing_text_pages:
        return "\n".join(page_texts).strip()

    try:
        import pypdfium2
    except ImportError as exc:
        logger.error("Scanned-PDF renderer is unavailable: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="This PDF contains scanned pages, but scanned-PDF rendering is unavailable. Install the OCR requirements and restart the service.",
        ) from exc

    require_tesseract()
    try:
        pdf = pypdfium2.PdfDocument(content)
        for index in missing_text_pages:
            page = pdf[index]
            bitmap = page.render(scale=2)
            page_image = bitmap.to_pil()
            page_texts[index] = extract_text_from_image(page_image)
            page.close()
        pdf.close()
    except HTTPException:
        raise
    except pytesseract.TesseractError as exc:
        logger.warning("Scanned-PDF OCR engine failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="The configured Tesseract engine could not OCR this PDF. Check the English language data and OCR installation.",
        ) from exc
    except Exception as exc:
        logger.warning("Scanned-PDF OCR failed: %s", type(exc).__name__)
        raise HTTPException(status_code=422, detail="Scanned PDF pages could not be processed.") from exc

    return "\n".join(page_texts).strip()


@app.post("/ocr/receipt")
async def ocr_receipt(file: UploadFile = File(...)):
    content = await file.read()
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File size exceeds the 10MB upload limit.")

    document_format = detect_document_format(file.filename or "", file.content_type or "", content)
    if document_format == "pdf":
        raw_text = read_pdf_text(content)
    else:
        if Image is None:
            raise HTTPException(
                status_code=503,
                detail="Image OCR dependencies are unavailable. Install the packages listed in backend/ml-service/requirements.txt.",
            )
        try:
            with Image.open(io.BytesIO(content)) as image:
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise HTTPException(status_code=413, detail="Image dimensions exceed the supported limit.")
                image.verify()
            require_tesseract()
            with Image.open(io.BytesIO(content)) as image:
                pil_image = ImageOps.exif_transpose(image).convert("RGB")
                raw_text = extract_text_from_image(pil_image)
        except HTTPException:
            raise
        except Image.DecompressionBombError as exc:
            raise HTTPException(status_code=413, detail="Image dimensions exceed the supported limit.") from exc
        except pytesseract.TesseractError as exc:
            logger.warning("Image OCR engine failed: %s", type(exc).__name__)
            raise HTTPException(
                status_code=503,
                detail="The configured Tesseract engine could not OCR this image. Check the English language data and OCR installation.",
            ) from exc
        except Exception as exc:
            logger.warning("Image decoding or OCR failed: %s", type(exc).__name__)
            raise HTTPException(status_code=400, detail="The image is corrupt or could not be processed.") from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text was found. Try a clearer image or enter the values manually.",
        )

    # Dev-mode logging: inspect raw text and candidate details without exposing sensitive info in production
    if DEV_MODE:
        logger.info("[DEV OCR] Extracted %d chars of text from %s (first 120 chars: %r)", len(raw_text), document_format, raw_text[:120])
    else:
        logger.debug("OCR extracted %d characters from %s document", len(raw_text), document_format)

    # -----------------------------------------------------------------------
    # CONTRACT NOTE DETECTION (Stocks & Equity Trading)
    # -----------------------------------------------------------------------
    contract_info = parse_contract_note(raw_text)
    if contract_info and contract_info.get("isContractNote"):
        logger.info(
            "Contract note detected: format=%s symbol=%s gross=%s charges=%s net=%s",
            document_format,
            contract_info.get("symbol"),
            contract_info.get("grossSaleValue"),
            contract_info.get("totalCharges"),
            contract_info.get("netProceeds"),
        )
        return {
            "raw_text": raw_text.strip(),
            "amount": contract_info["amount"],
            "date": contract_info["date"],
            "merchant": contract_info["merchant"],
            "description": contract_info["description"],
            "paymentMethod": "Bank Account",
            "suggestedCategory": contract_info["suggestedCategory"],
            "confidence": contract_info["confidence"],
            "isLowConfidence": False,
            "documentType": contract_info["documentType"],
            "transactionType": contract_info["transactionType"],
            "isSalarySlip": False,
            "grossSalary": None,
            "deductions": None,
            "netSalary": None,
            "contractNote": {
                "symbol": contract_info.get("symbol"),
                "company": contract_info.get("company"),
                "quantity": contract_info.get("quantity"),
                "pricePerShare": contract_info.get("pricePerShare"),
                "grossSaleValue": contract_info.get("grossSaleValue"),
                "totalCharges": contract_info.get("totalCharges"),
                "netProceeds": contract_info.get("netProceeds"),
                "tradeDate": contract_info.get("tradeDate"),
                "settlementDate": contract_info.get("settlementDate"),
                "chargesBreakdown": contract_info.get("chargesBreakdown"),
                "arithmeticVerified": contract_info.get("arithmeticVerified"),
                "discrepancyWarning": contract_info.get("discrepancyWarning"),
                "profitNote": contract_info.get("profitNote"),
            },
        }

    # -----------------------------------------------------------------------
    # DIVIDEND STATEMENT DETECTION
    # -----------------------------------------------------------------------
    dividend_info = parse_dividend_details(raw_text)
    if dividend_info and dividend_info.get("isDividend"):
        return {
            "raw_text": raw_text.strip(),
            "amount": dividend_info["amount"],
            "date": dividend_info["date"],
            "merchant": dividend_info["merchant"],
            "description": dividend_info["description"],
            "paymentMethod": "Bank Account",
            "suggestedCategory": dividend_info["suggestedCategory"],
            "confidence": dividend_info["confidence"],
            "isLowConfidence": False,
            "documentType": dividend_info["documentType"],
            "transactionType": dividend_info["transactionType"],
            "isSalarySlip": False,
            "grossSalary": dividend_info.get("grossAmount"),
            "deductions": dividend_info.get("tdsAmount"),
            "netSalary": dividend_info["amount"],
        }

    # -----------------------------------------------------------------------
    # INTEREST STATEMENT DETECTION
    # -----------------------------------------------------------------------
    interest_info = parse_interest_details(raw_text)
    if interest_info and interest_info.get("isInterest"):
        return {
            "raw_text": raw_text.strip(),
            "amount": interest_info["amount"],
            "date": interest_info["date"],
            "merchant": interest_info["merchant"],
            "description": interest_info["description"],
            "paymentMethod": "Bank Account",
            "suggestedCategory": interest_info["suggestedCategory"],
            "confidence": interest_info["confidence"],
            "isLowConfidence": False,
            "documentType": interest_info["documentType"],
            "transactionType": interest_info["transactionType"],
            "isSalarySlip": False,
            "grossSalary": None,
            "deductions": None,
            "netSalary": None,
        }

    # -----------------------------------------------------------------------
    # SALARY SLIP DETECTION
    # -----------------------------------------------------------------------
    salary_info = parse_salary_details(raw_text)
    is_salary_slip = False
    gross_salary = None
    deductions = None
    net_salary = None

    if salary_info and salary_info["isSalary"]:
        is_salary_slip = True
        gross_salary = salary_info["grossSalary"]
        deductions = salary_info["deductions"]
        net_salary = salary_info["netSalary"]

    # -----------------------------------------------------------------------
    # AMOUNT EXTRACTION & ITEM SUMMARY
    # -----------------------------------------------------------------------
    amount, amount_confidence, debug_candidates, item_description = extract_amount(raw_text)

    if is_salary_slip:
        if net_salary:
            amount = net_salary
            amount_confidence = 0.95
        elif gross_salary and deductions:
            amount = gross_salary - deductions
            net_salary = amount
            amount_confidence = 0.85

    if DEV_MODE and debug_candidates:
        logger.info("[DEV OCR] Amount candidates: %s", debug_candidates)

    # -----------------------------------------------------------------------
    # FIELD EXTRACTION
    # -----------------------------------------------------------------------
    date_str = extract_date(raw_text)
    merchant = extract_merchant(raw_text)
    payment_method = extract_payment_method(raw_text)
    suggested_cat = classify_category(raw_text)

    if is_salary_slip:
        suggested_cat = "Salary"

    description = "" if is_salary_slip else item_description

    # -----------------------------------------------------------------------
    # TRANSACTION TYPE DETECTION
    # -----------------------------------------------------------------------
    lower_text = raw_text.lower()
    has_expense_signals = any(
        signal in lower_text
        for signal in (
            "receipt", "invoice", "amount payable", "grand total", "bill no",
            "tax invoice", "subtotal", "payment received", "cashier", "grocery",
            "mart", "store", "supermarket", "total amount",
        )
    )
    has_income_signals = any(
        signal in lower_text
        for signal in (
            "payroll", "salary", "payslip", "pay slip", "net pay", "gross pay",
            "amount credited", "dividend", "interest income", "pension", "stipend",
        )
    )
    transaction_type = (
        "INCOME"
        if is_salary_slip or has_income_signals
        else "EXPENSE"
        if has_expense_signals or (amount is not None and merchant and _CURRENCY_BARE.search(raw_text))
        else "UNKNOWN"
    )
    document_type = "SALARY_SLIP" if is_salary_slip else ("RECEIPT" if transaction_type == "EXPENSE" else "OTHER")

    # -----------------------------------------------------------------------
    # CONFIDENCE SCORING & LOW-CONFIDENCE FLAG
    # -----------------------------------------------------------------------
    field_bonus = (0.05 if merchant else 0) + (0.03 if date_str else 0) + (0.02 if payment_method else 0)
    overall_confidence = min(0.99, round(amount_confidence + field_bonus, 2))
    is_low_confidence = overall_confidence < 0.60 or amount is None or amount <= 0

    logger.info(
        "OCR completed: format=%s type=%s amount=%s merchant=%r confidence=%.2f low_conf=%s chars=%d",
        document_format,
        transaction_type,
        amount,
        merchant,
        overall_confidence,
        is_low_confidence,
        len(raw_text),
    )

    return {
        "raw_text": raw_text.strip(),
        "amount": amount,
        "date": date_str,
        "merchant": merchant,
        "description": description,
        "paymentMethod": payment_method,
        "suggestedCategory": suggested_cat,
        "confidence": overall_confidence,
        "isLowConfidence": is_low_confidence,
        "documentType": document_type,
        "transactionType": transaction_type,
        "isSalarySlip": is_salary_slip,
        "grossSalary": gross_salary,
        "deductions": deductions,
        "netSalary": net_salary,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)



