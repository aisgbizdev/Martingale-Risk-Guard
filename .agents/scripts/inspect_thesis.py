"""Extract supplied PDF evidence and render requested pages (1-based PDF numbering)."""
import argparse
from pathlib import Path
import pymupdf as fitz

parser = argparse.ArgumentParser()
parser.add_argument("pdf", type=Path)
parser.add_argument("--pages", type=int, nargs="*", default=[1])
parser.add_argument("--name", default="thesis")
args = parser.parse_args()
output = Path("generated-artifacts/evidence")
output.mkdir(parents=True, exist_ok=True)
doc = fitz.open(args.pdf)
with (output / f"{args.name}.txt").open("w") as text:
    for index, page in enumerate(doc):
        text.write(f"\n\n=== PDF PAGE {index + 1} ===\n{page.get_text(sort=True)}")
for number in args.pages:
    doc[number - 1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(
        str(output / f"{args.name}-{number}.png")
    )
print(f"{args.name}: {len(doc)} pages; extracted text and rendered {args.pages}")
