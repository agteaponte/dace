import fitz  # PyMuPDF
import os

def render_pdf_to_images(pdf_path, output_dir):
    print(f"Rendering {pdf_path}...")
    doc = fitz.open(pdf_path)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        output_path = os.path.join(output_dir, f"{base_name}_page_{page_num + 1}.png")
        pix.save(output_path)
        print(f"Saved {output_path}")

if __name__ == "__main__":
    artifacts_dir = r"C:\Users\Nino5\.gemini\antigravity-ide\brain\c30bd50b-727e-48a9-8373-e7dfc51c7add"
    render_pdf_to_images("PPR-137.1.pdf", artifacts_dir)
    render_pdf_to_images("PPR-137.3.pdf", artifacts_dir)
    print("All done rendering PDFs to images!")
