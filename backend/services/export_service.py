"""Export service helpers."""

import csv
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from openpyxl import Workbook


def export_to_excel(data: list, headers: list, filename: str):
    """Return XLSX bytes for the provided tabular dataset."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Export"

    ws.append(headers)
    for row in data:
        if isinstance(row, dict):
            ws.append([row.get(h) for h in headers])
        else:
            ws.append(list(row))

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def export_to_pdf(template: str, context: dict, filename: str):
    """Render a simple text PDF from a context payload."""
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    y = 760

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, template or "Export")
    y -= 24

    pdf.setFont("Helvetica", 10)
    for key, value in (context or {}).items():
        line = f"{key}: {value}"
        pdf.drawString(40, y, line[:110])
        y -= 16
        if y < 60:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = 760

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def export_to_csv(data: list, headers: list):
    """Return CSV content as a string for the provided tabular dataset."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in data:
        if isinstance(row, dict):
            writer.writerow([row.get(h) for h in headers])
        else:
            writer.writerow(list(row))
    return output.getvalue()
