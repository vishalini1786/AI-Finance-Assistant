# FinMan ML & OCR Service Container
# Includes Tesseract 5 with English and OSD language models
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# On Debian/Ubuntu Linux, tesseract is installed in /usr/bin/tesseract
ENV TESSERACT_CMD=/usr/bin/tesseract
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

ENV PORT=8000
EXPOSE 8000

CMD sh -c "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"
