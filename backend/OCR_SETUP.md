# FinMan OCR Setup Guide

## Tesseract 5.x Installation (Windows)

The Python packages (pytesseract, Pillow, OpenCV) are already installed.
You need to install the Tesseract binary separately.

### Step 1: Download Tesseract 5.x Installer

Download from the official Windows installer:
https://github.com/UB-Mannheim/tesseract/wiki

**Recommended version**: `tesseract-ocr-w64-setup-5.x.x.exe`

### Step 2: Install

Run the installer. Default path: `C:\Program Files\Tesseract-OCR\`

During installation, also select "Additional script data" → English (eng).

### Step 3: Add to PATH (optional)

Add `C:\Program Files\Tesseract-OCR` to your system PATH.

### Step 4: Verify

Open a new terminal and run:
```
tesseract --version
```

Expected output:
```
tesseract 5.x.x
 ...
 LSTM enabled
```

### Step 5: Configure ML Service

If the ML service (Python FastAPI) is running, it will automatically use Tesseract.

Ensure `AI_SERVICE_URL=http://localhost:8000` in backend `.env`.

### Step 6: Run the OCR Service

The OCR endpoint is built into the existing Python ML service.
If you have a `ml_service.py`, integrate the `ocr_service.py` routes into it.

Or run standalone:
```bash
pip install fastapi uvicorn pytesseract Pillow opencv-python-headless
python backend/ocr_service.py
```

## Without Tesseract

If Tesseract is not installed:
- The OCR endpoint returns a 503 with clear setup instructions
- The application does **not** crash
- Users can still manually enter expense details

## OCR Pipeline

```
Upload Image
    ↓
Validate + Remove Alpha
    ↓
Deskew (Hough Transform)
    ↓
Run 5 Preprocessing Variants:
  A: Grayscale + CLAHE
  B: Grayscale + Adaptive Threshold
  C: Grayscale + Otsu
  D: 2x Upscale + Sharpen + Adaptive
  E: Grayscale PSM-3 Auto
    ↓
Select best by OCR confidence score
    ↓
Extract: Merchant | Amount | Date
    ↓
Keyword category classification
    ↓
Return structured JSON + confidence
    ↓
User confirms → Expense saved
```
