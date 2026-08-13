import pdfplumber
import json

def inspect_pdf_layout(filepath, output_txt):
    with pdfplumber.open(filepath) as pdf:
        with open(output_txt, "w", encoding="utf-8") as f:
            f.write(f"=== LAYOUT FOR {filepath} ===\n")
            for page_num, page in enumerate(pdf.pages):
                f.write(f"\n--- Page {page_num + 1} ---\n")
                f.write(f"Page size: Width={page.width}, Height={page.height}\n")
                
                f.write("\n--- Lines ---\n")
                for line in page.lines:
                    f.write(f"Line: x0={line['x0']:.1f}, y0={line['top']:.1f}, x1={line['x1']:.1f}, y1={line['bottom']:.1f}\n")
                
                f.write("\n--- Rectangles ---\n")
                for rect in page.rects:
                    f.write(f"Rect: x0={rect['x0']:.1f}, y0={rect['top']:.1f}, x1={rect['x1']:.1f}, y1={rect['bottom']:.1f}, width={rect['width']:.1f}, height={rect['height']:.1f}\n")
                
                f.write("\n--- Words / Texts ---\n")
                words = page.extract_words()
                # Sort words primarily by top (y) and then by x0 (x)
                words_sorted = sorted(words, key=lambda w: (w['top'], w['x0']))
                
                # Group words that are on similar horizontal levels (e.g. within 2 units)
                lines = []
                current_line = []
                current_top = -999
                for w in words_sorted:
                    if current_top == -999 or abs(w['top'] - current_top) < 3:
                        current_line.append(w)
                        if current_top == -999:
                            current_top = w['top']
                    else:
                        lines.append(current_line)
                        current_line = [w]
                        current_top = w['top']
                if current_line:
                    lines.append(current_line)
                
                for line_words in lines:
                    line_words_sorted = sorted(line_words, key=lambda w: w['x0'])
                    line_text = " ".join([w['text'] for w in line_words_sorted])
                    avg_top = sum([w['top'] for w in line_words]) / len(line_words)
                    min_x = min([w['x0'] for w in line_words])
                    f.write(f"Text (y={avg_top:.1f}, x={min_x:.1f}): {line_text}\n")

if __name__ == "__main__":
    inspect_pdf_layout("PPR-137.1.pdf", "layout_137_1.txt")
    inspect_pdf_layout("PPR-137.3.pdf", "layout_137_3.txt")
    print("Done inspecting layout")
