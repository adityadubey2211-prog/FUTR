
import fitz


def extract_pdf_text(pdf_content: bytes):
    extracted_pages = []

    with fitz.open(stream=pdf_content, filetype="pdf") as pdf:
        if len(pdf) > 30:
            raise ValueError("PDF cannot contain more than 30 pages")

        for page_number, page in enumerate(pdf, start=1):
            page_text = page.get_text("text").strip()

            if page_text:
                extracted_pages.append({
                    "page": page_number,
                    "text": page_text
                })

    if not extracted_pages:
        raise ValueError(
            "No readable text found. This may be a scanned PDF."
        )

    return extracted_pages
