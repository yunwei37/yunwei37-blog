#!/usr/bin/env python3
"""Add page numbers to a PDF exported by slidev."""
import sys
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color

def add_page_numbers(input_path, output_path):
    reader = PdfReader(input_path)
    writer = PdfWriter()
    total = len(reader.pages)

    for i, page in enumerate(reader.pages):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)

        # Create overlay with page number
        packet = BytesIO()
        c = canvas.Canvas(packet, pagesize=(width, height))
        c.setFont("Helvetica", 10)
        c.setFillColor(Color(0.6, 0.6, 0.6))
        text = f"{i + 1} / {total}"
        c.drawRightString(width - 20, 15, text)
        c.save()
        packet.seek(0)

        overlay = PdfReader(packet).pages[0]
        page.merge_page(overlay)
        writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    inp = sys.argv[1] if len(sys.argv) > 1 else "slides-export.pdf"
    out = sys.argv[2] if len(sys.argv) > 2 else "slides.pdf"
    add_page_numbers(inp, out)
    print(f"Page numbers added: {out}")
