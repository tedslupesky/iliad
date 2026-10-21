#!/usr/bin/env python3
"""Convert the Perseus TEI XML of the Iliad into per-book JSON for the app.

Sources (downloaded into data-src/ if missing):
  - Greek: Monro & Allen (OCT, 1920), perseus-grc2
  - English: A. T. Murray (Loeb, 1924), perseus-eng3

Output: public/data/index.json and public/data/book-NN.json
"""
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
OUT = ROOT / "public" / "data"
BASE = "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0012/tlg001/"
FILES = {
    "grc.xml": BASE + "tlg0012.tlg001.perseus-grc2.xml",
    "eng3.xml": BASE + "tlg0012.tlg001.perseus-eng3.xml",
}
TEI = "{http://www.tei-c.org/ns/1.0}"


def fetch_sources():
    SRC.mkdir(exist_ok=True)
    for name, url in FILES.items():
        path = SRC / name
        if not path.exists():
            print(f"downloading {url}")
            urllib.request.urlretrieve(url, path)


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def greek_books():
    root = ET.parse(SRC / "grc.xml").getroot()
    books = {}
    for div in root.iter(TEI + "div"):
        if div.get("subtype") != "Book":
            continue
        lines = []
        for l in div.iter(TEI + "l"):
            line = {"n": int(l.get("n")), "t": clean("".join(l.itertext()))}
            if l.find(TEI + "milestone[@unit='para']") is not None or l.find(TEI + "milestone[@unit='Para']") is not None:
                line["p"] = True
            lines.append(line)
        books[int(div.get("n"))] = lines
    return books


def english_books():
    """Split each book into segments that start at a Greek line number.

    Murray's prose carries <milestone unit="line" n="..."/> markers every
    five lines or so; each card <div> also starts at a known line.
    """
    root = ET.parse(SRC / "eng3.xml").getroot()
    books = {}
    for book in root.iter(TEI + "div"):
        if book.get("subtype") != "book":
            continue
        segments = []

        def start(n):
            if segments and not segments[-1]["t"].strip():
                segments[-1]["n"] = n
            else:
                segments.append({"n": n, "t": ""})

        def walk(el):
            for child in el:
                tag = child.tag.replace(TEI, "")
                if tag == "milestone" and child.get("unit") == "line":
                    start(int(child.get("n")))
                elif tag != "note":
                    if child.text:
                        segments[-1]["t"] += child.text
                    walk(child)
                if child.tail:
                    segments[-1]["t"] += child.tail

        for card in book.findall(TEI + "div"):
            start(int(card.get("n")))
            if card.text:
                segments[-1]["t"] += card.text
            walk(card)

        # A couple of cards start a line or two "before" the previous
        # milestone; fold those into the preceding segment to keep order.
        merged = []
        for s in segments:
            text = clean(s["t"])
            if not text:
                continue
            if merged and s["n"] <= merged[-1]["n"]:
                merged[-1]["t"] += " " + text
            else:
                merged.append({"n": s["n"], "t": text})
        books[int(book.get("n"))] = merged
    return books


def main():
    fetch_sources()
    greek = greek_books()
    english = english_books()
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for n in sorted(greek):
        data = {"book": n, "greek": greek[n], "english": english[n]}
        (OUT / f"book-{n:02d}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        index.append({"book": n, "lines": len(greek[n])})
    (OUT / "index.json").write_text(json.dumps(index, indent=1))
    print(f"wrote {len(index)} books, {sum(b['lines'] for b in index)} lines")


if __name__ == "__main__":
    main()
