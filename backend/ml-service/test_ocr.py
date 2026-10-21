import asyncio
import io
import unittest

from fastapi import HTTPException, UploadFile
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
from starlette.datastructures import Headers
from PIL import Image

import app


def make_pdf(text=None):
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    if text:
        font = DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        })
        font_reference = writer._add_object(font)
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_reference})
        })
        stream = DecodedStreamObject()
        safe_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream.set_data(f"BT /F1 12 Tf 72 720 Td ({safe_text}) Tj ET".encode("ascii"))
        page[NameObject("/Contents")] = writer._add_object(stream)
    result = io.BytesIO()
    writer.write(result)
    return result.getvalue()


def make_upload(filename, content_type, content):
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


class OCRUploadTests(unittest.TestCase):
    def test_detects_image_signatures_case_insensitively(self):
        self.assertEqual(
            app.detect_document_format("scan.PNG", "image/png", b"\x89PNG\r\n\x1a\nbody"),
            "png",
        )
        self.assertEqual(
            app.detect_document_format("scan.JpG", "image/jpeg", b"\xff\xd8\xffbody"),
            "jpeg",
        )

    def test_detects_apng_and_generic_mimes(self):
        self.assertEqual(
            app.detect_document_format("screenshot.png", "image/apng", b"\x89PNG\r\n\x1a\nbody"),
            "png",
        )
        self.assertEqual(
            app.detect_document_format("receipt", "application/octet-stream", b"\x89PNG\r\n\x1a\nbody"),
            "png",
        )
        self.assertEqual(
            app.detect_document_format("receipt", "application/octet-stream", b"\xff\xd8\xffbody"),
            "jpeg",
        )

    def test_detects_jfif_and_x_pdf(self):
        self.assertEqual(
            app.detect_document_format("photo.jfif", "image/jfif", b"\xff\xd8\xffbody"),
            "jpeg",
        )
        self.assertEqual(
            app.detect_document_format("invoice.pdf", "application/x-pdf", b"%PDF-1.4\nbody"),
            "pdf",
        )

    def test_rejects_content_and_mime_mismatches(self):
        with self.assertRaises(HTTPException) as mismatch:
            app.detect_document_format("scan.png", "image/png", b"\xff\xd8\xffbody")
        self.assertEqual(mismatch.exception.status_code, 400)
        with self.assertRaises(HTTPException) as unsupported:
            app.detect_document_format("scan.png", "image/png", b"not an image")
        self.assertEqual(unsupported.exception.status_code, 400)

    def test_image_is_decoded_before_missing_engine_error(self):
        image = Image.new("RGB", (8, 8), "white")
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="PNG")

        # When engine is missing, it raises 503
        orig = app.is_tesseract_available
        try:
            app.is_tesseract_available = lambda: False
            with self.assertRaises(HTTPException) as result:
                asyncio.run(app.ocr_receipt(make_upload("test.png", "image/png", image_bytes.getvalue())))
            self.assertEqual(result.exception.status_code, 503)
            self.assertIn("Tesseract", result.exception.detail)
        finally:
            app.is_tesseract_available = orig

        # When engine is available, a blank image cleanly reports no readable text (422)
        if app.is_tesseract_available():
            with self.assertRaises(HTTPException) as res2:
                asyncio.run(app.ocr_receipt(make_upload("test.png", "image/png", image_bytes.getvalue())))
            self.assertEqual(res2.exception.status_code, 422)

    def test_jpeg_is_decoded_before_missing_engine_error(self):
        image = Image.new("RGB", (8, 8), "white")
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="JPEG")

        orig = app.is_tesseract_available
        try:
            app.is_tesseract_available = lambda: False
            with self.assertRaises(HTTPException) as result:
                asyncio.run(app.ocr_receipt(make_upload("test.JPG", "image/jpeg", image_bytes.getvalue())))
            self.assertEqual(result.exception.status_code, 503)
            self.assertIn("Tesseract", result.exception.detail)
        finally:
            app.is_tesseract_available = orig

        if app.is_tesseract_available():
            with self.assertRaises(HTTPException) as res2:
                asyncio.run(app.ocr_receipt(make_upload("test.JPG", "image/jpeg", image_bytes.getvalue())))
            self.assertEqual(res2.exception.status_code, 422)

    def test_corrupt_image_is_reported_as_invalid(self):
        with self.assertRaises(HTTPException) as result:
            asyncio.run(app.ocr_receipt(make_upload(
                "test.png", "image/png", b"\x89PNG\r\n\x1a\ncorrupt"
            )))
        self.assertEqual(result.exception.status_code, 400)

    def test_digital_pdf_uses_text_extraction_without_tesseract(self):
        text = "Receipt\nAmount payable: Rs 250.00\nDate 20/10/2026"
        result = asyncio.run(app.ocr_receipt(make_upload(
            "digital.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertIn("Amount payable", result["raw_text"])
        self.assertEqual(result["amount"], 250.0)
        self.assertEqual(result["transactionType"], "EXPENSE")

    def test_salary_slip_is_classified_as_income_and_prefers_net_pay(self):
        text = "Salary Slip\nGross salary: Rs 70,000\nDeductions: Rs 10,000\nNet pay: Rs 60,000"
        result = asyncio.run(app.ocr_receipt(make_upload(
            "payslip.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertEqual(result["transactionType"], "INCOME")
        self.assertEqual(result["documentType"], "SALARY_SLIP")
        self.assertEqual(result["grossSalary"], 70000.0)
        self.assertEqual(result["deductions"], 10000.0)
        self.assertEqual(result["netSalary"], 60000.0)
        self.assertEqual(result["amount"], 60000.0)

    def test_filename_alone_does_not_classify_salary_document(self):
        result = asyncio.run(app.ocr_receipt(make_upload(
            "salary.pdf", "application/pdf", make_pdf("Acme Holdings")
        )))
        self.assertEqual(result["transactionType"], "UNKNOWN")

    def test_malformed_pdf_is_reported_as_invalid(self):
        with self.assertRaises(HTTPException) as result:
            asyncio.run(app.ocr_receipt(make_upload(
                "broken.pdf", "application/pdf", b"%PDF-1.7 not a valid PDF"
            )))
        self.assertEqual(result.exception.status_code, 400)

    def test_scanned_pdf_has_a_distinct_engine_or_renderer_diagnostic(self):
        orig = app.is_tesseract_available
        try:
            app.is_tesseract_available = lambda: False
            with self.assertRaises(HTTPException) as result:
                asyncio.run(app.ocr_receipt(make_upload(
                    "scanned.pdf", "application/pdf", make_pdf()
                )))
            self.assertEqual(result.exception.status_code, 503)
            self.assertTrue(
                "Tesseract" in result.exception.detail
                or "scanned-PDF" in result.exception.detail
                or "scanned pages" in result.exception.detail
            )
        finally:
            app.is_tesseract_available = orig

        if app.is_tesseract_available():
            with self.assertRaises(HTTPException) as res2:
                asyncio.run(app.ocr_receipt(make_upload(
                    "scanned.pdf", "application/pdf", make_pdf()
                )))
            self.assertEqual(res2.exception.status_code, 422)

    def test_empty_and_oversized_uploads_are_rejected(self):
        with self.assertRaises(HTTPException) as empty:
            asyncio.run(app.ocr_receipt(make_upload("empty.png", "image/png", b"")))
        self.assertEqual(empty.exception.status_code, 400)
        with self.assertRaises(HTTPException) as oversized:
            asyncio.run(app.ocr_receipt(make_upload(
                "large.png", "image/png", b"\x89PNG\r\n\x1a\n" + b"x" * app.MAX_UPLOAD_BYTES
            )))
        self.assertEqual(oversized.exception.status_code, 413)


    def test_image_ocr_with_available_tesseract_engine(self):
        if not app.is_tesseract_available():
            self.skipTest("Tesseract not available")
        from PIL import ImageDraw
        img = Image.new("RGB", (300, 100), "white")
        draw = ImageDraw.Draw(img)
        draw.text((10, 20), "Cafe Coffee\nDate: 2026-10-20\nTotal: INR 250.00", fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        result = asyncio.run(app.ocr_receipt(make_upload("receipt.png", "image/png", buf.getvalue())))
        self.assertIn("amount", result)
        self.assertEqual(result["amount"], 250.0)
        self.assertEqual(result["transactionType"], "EXPENSE")

    def test_fresh_mart_grocery_receipt_layout(self):
        receipt_text = (
            "FRESH MART\n"
            "GROCERY & DAILY ESSENTIALS\n\n"
            "No. 12, Main Road, Anna Nagar\n"
            "Chennai - 600040\n"
            "Ph: 044-4210 7890\n\n"
            "Bill No : GB-2026-10482 Cashier : Rajesh\n"
            "Date : 20-10-2026 Store ID : FM001\n"
            "Time : 10:32 AM Terminal : T02\n"
            "S.No ITEM NAME QTY PRICE AMOUNT (2)\n"
            "1 Basmati Rice (5kg) 1 320.00 320.00\n"
            "2 Fresh Milk (1L) 2 30.00 60.00\n"
            "3 Tea Powder (250g) 1 95.00 95.00\n"
            "4 Fresh Vegetables 1 145.00 145.00\n"
            "5 Shopping Bag 1 20.00 20.00\n"
            "Subtotal %640.00\n"
            "Discount 0.00\n"
            "Total Items 5\n"
            "TOTAL AMOUNT ~640.00\n\n"
            "Payment Mode : UPI (PhonePe)\n"
            "UPI Ref No =: 628374921036\n"
            "Thank you for shopping with us!"
        )
        result = asyncio.run(app.ocr_receipt(make_upload(
            "grocery.pdf", "application/pdf", make_pdf(receipt_text)
        )))
        self.assertEqual(result["amount"], 640.0, "Should extract 640.00, NOT pincode 600040 or bill number")
        self.assertNotEqual(result["amount"], 600040.0, "Pincode 600040 must NEVER be chosen as the amount")
        self.assertEqual(result["merchant"], "FRESH MART", "Store name should be FRESH MART, not tagline or address")
        self.assertEqual(result["date"], "2026-10-20")
        self.assertEqual(result["paymentMethod"], "UPI")
        self.assertEqual(result["transactionType"], "EXPENSE")
        self.assertTrue(len(result["description"]) > 0, "Description should summarize purchased items")
        self.assertIn("Basmati Rice", result["description"])
        self.assertIn("Milk", result["description"])
        self.assertGreaterEqual(result["confidence"], 0.90)
        self.assertFalse(result["isLowConfidence"])

    def test_actual_uploaded_fresh_mart_image(self):
        from pathlib import Path
        img_path = Path("backend/uploads/1792526096297-Fresh_Mart_Grocery_Receipt.png")
        if not img_path.is_file() or not app.is_tesseract_available():
            self.skipTest("Fresh Mart test image or Tesseract not available")
        with open(img_path, "rb") as f:
            content = f.read()
        result = asyncio.run(app.ocr_receipt(make_upload(
            "Fresh_Mart_Grocery_Receipt.png", "image/png", content
        )))
        self.assertEqual(result["amount"], 640.0)
        self.assertNotEqual(result["amount"], 600040.0)
        self.assertEqual(result["merchant"], "FRESH MART")
        self.assertEqual(result["date"], "2026-10-20")
        self.assertEqual(result["paymentMethod"], "UPI")
        self.assertTrue("Basmati Rice" in result["description"])
        self.assertFalse(result["isLowConfidence"])

    def test_unrelated_numbers_rejected_when_total_missing(self):
        text = (
            "METRO PHARMACY\n"
            "Branch: MG Road, Bangalore - 560001\n"
            "Phone: 9876543210\n"
            "Invoice No: INV-2026-88741\n"
            "Date: 21-10-2026\n"
            "Store ID: STR09\n"
            "Terminal: T04\n"
            "Cashier: Rajesh\n"
            "UPI Ref No: 489201948192\n"
            "Thank you for visiting!"
        )
        result = asyncio.run(app.ocr_receipt(make_upload(
            "pharmacy.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertNotEqual(result["amount"], 560001.0, "Pincode 560001 must not become expense amount")
        self.assertNotEqual(result["amount"], 9876543210.0, "Phone number must not become amount")
        self.assertNotEqual(result["amount"], 88741.0, "Invoice number must not become amount")
        self.assertNotEqual(result["amount"], 2026.0, "Year must not become amount")
        self.assertTrue(result["isLowConfidence"])

    def test_amount_with_commas_and_decimals(self):
        text = (
            "SUPER TECH ELECTRONICS\n"
            "Date: 15-09-2026\n"
            "Payment Mode: Credit Card\n"
            "Grand Total : INR 1,25,450.75\n"
        )
        result = asyncio.run(app.ocr_receipt(make_upload(
            "electronics.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertEqual(result["amount"], 125450.75)
        self.assertEqual(result["paymentMethod"], "Credit Card")
        self.assertFalse(result["isLowConfidence"])

    def test_discounts_taxes_and_total_amount(self):
        text = (
            "CITY RESTAURANT\n"
            "Date: 10-10-2026\n"
            "Subtotal: Rs. 500.00\n"
            "Discount: Rs. 50.00\n"
            "CGST (2.5%): Rs. 11.25\n"
            "SGST (2.5%): Rs. 11.25\n"
            "TOTAL AMOUNT PAYABLE: Rs. 472.50\n"
            "Payment Mode: Cash\n"
        )
        result = asyncio.run(app.ocr_receipt(make_upload(
            "food.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertEqual(result["amount"], 472.50)
        self.assertEqual(result["paymentMethod"], "Cash")

    def test_missing_total_calculates_sum_of_items(self):
        text = (
            "CORNER BAKERY\n"
            "Date: 18-10-2026\n"
            "Item Price\n"
            "Whole Wheat Bread  45.00\n"
            "Salted Butter      85.00\n"
            "Farm Eggs          60.00\n"
            "Thank you!"
        )
        result = asyncio.run(app.ocr_receipt(make_upload(
            "bakery.pdf", "application/pdf", make_pdf(text)
        )))
        self.assertEqual(result["amount"], 190.0)
        self.assertIn("Whole Wheat Bread", result["description"])
        self.assertIn("Salted Butter", result["description"])

    def test_cash_and_card_payment_methods(self):
        cash_text = "STORE\nTotal: Rs 100.00\nPaid in Cash"
        card_text = "STORE\nTotal: Rs 200.00\nPayment: Credit Card"
        res_cash = asyncio.run(app.ocr_receipt(make_upload("cash.pdf", "application/pdf", make_pdf(cash_text))))
        res_card = asyncio.run(app.ocr_receipt(make_upload("card.pdf", "application/pdf", make_pdf(card_text))))
        self.assertEqual(res_cash["paymentMethod"], "Cash")
        self.assertEqual(res_card["paymentMethod"], "Credit Card")


if __name__ == "__main__":
    unittest.main()

