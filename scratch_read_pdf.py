import pypdf
import sys

def inspect_pdf(filepath, out_f):
    out_f.write(f"\n=== Inspecting {filepath} ===\n")
    try:
        reader = pypdf.PdfReader(filepath)
        out_f.write(f"Number of pages: {len(reader.pages)}\n")
        for idx, page in enumerate(reader.pages):
            out_f.write(f"--- Page {idx + 1} ---\n")
            text = page.extract_text()
            out_f.write(text)
            out_f.write(f"\n--- End of Page {idx + 1} ---\n")
    except Exception as e:
        out_f.write(f"Error reading {filepath}: {e}\n")

if __name__ == "__main__":
    with open("pdf_text.txt", "w", encoding="utf-8") as f:
        inspect_pdf("PPR-137.1.pdf", f)
        inspect_pdf("PPR-137.3.pdf", f)
    print("Done writing to pdf_text.txt")
