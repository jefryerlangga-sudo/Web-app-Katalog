"""Build data/import/import_baterai.csv from the owner price-list PDFs."""
import csv
import re
from collections import Counter
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PRICE_RE = re.compile(r"^\d{1,3}(?:,\d{3})*\.\d{2}$")
CODE_RE = re.compile(r"^[A-Z]{2,4}-[A-Z0-9]{2,}$")
SKIP = {"NO", "NAMA", "BARANG", "HARGA", "BATT", "BATTERY", "BATERAI", "SML"}
BRAND_WORD = {"OG", "HX", "LF"}
PHONE = [
    ("IPHONE", "iPhone"),
    ("IPH", "iPhone"),
    ("SAMSUNG", "Samsung"),
    ("SAMS", "Samsung"),
    ("INFINIX", "Infinix"),
    ("INF", "Infinix"),
    ("OPPO", "Oppo"),
    ("OPP", "Oppo"),
    ("OP", "Oppo"),
    ("VIVO", "Vivo"),
    ("REDMI", "Xiaomi/Redmi/Poco"),
    ("R.NOTE", "Xiaomi/Redmi/Poco"),
    ("POCO", "Xiaomi/Redmi/Poco"),
    ("XIAOMI", "Xiaomi/Redmi/Poco"),
    ("XMI", "Xiaomi/Redmi/Poco"),
    ("XIA", "Xiaomi/Redmi/Poco"),
    ("REALME", "Realme"),
    ("RLM", "Realme"),
    ("RMX", "Realme"),
    ("ASUS", "Asus"),
    ("ITEL", "Itel"),
    ("TECNO", "Tecno"),
    ("NOKIA", "Nokia"),
    ("HUAWEI", "Huawei"),
    ("HONOR", "Honor"),
    ("ADVAN", "Advan"),
    ("MEIZU", "Meizu"),
]
KEEP = {
    "PRO": "Pro",
    "MAX": "Max",
    "MINI": "Mini",
    "PLUS": "Plus",
    "ULTRA": "Ultra",
    "NOTE": "Note",
    "HOT": "Hot",
    "SMART": "Smart",
    "PLAY": "Play",
    "PLY": "Play",
    "ZERO": "Zero",
    "LITE": "Lite",
    "PRIME": "Prime",
    "AIR": "Air",
    "SE": "SE",
    "FE": "FE",
    "MI": "Mi",
}
SOURCES = {
    "OG": "list1_4539.pdf",
    "LF": "list2_3146.pdf",
    "HX": "list3_03f8.pdf",
}
PREFIX = {"OG": "PS-BOG", "HX": "PS-BHX", "LF": "PS-BLF"}
IMAGE = {
    "OG": "https://portaltech-katalog.vercel.app/baterai/og.webp",
    "HX": "https://portaltech-katalog.vercel.app/baterai/hx.webp",
    "LF": "https://portaltech-katalog.vercel.app/baterai/lf.webp",
}


def title_token(tok: str) -> str:
    if "/" in tok:
        return "/".join(title_token(part) for part in tok.split("/"))
    if tok in KEEP:
        return KEEP[tok]
    if re.fullmatch(r"\d+G", tok):
        return tok
    if re.search(r"\d", tok) and re.search(r"[A-Za-z]", tok):
        return tok
    if tok.isupper() and len(tok) > 1 and tok.isalpha():
        return tok.title()
    return tok


def phone_label(tok: str):
    for key, label in PHONE:
        if tok == key:
            return label
    return None


def parse_pdf(path: Path):
    pdf = pdfplumber.open(path)
    rows = []
    for page in pdf.pages:
        words = page.extract_words()
        prices = sorted(
            [word for word in words if PRICE_RE.match(word["text"]) and word["x0"] > 480],
            key=lambda word: word["top"],
        )
        numbers = [
            word
            for word in words
            if re.fullmatch(r"\d+", word["text"]) and 320 < word["x0"] < 390
        ]
        names = [
            word
            for word in words
            if 376 <= word["x0"] < 545
            and word["text"] not in {"NO", "NAMA", "BARANG", "HARGA"}
            and not PRICE_RE.match(word["text"])
        ]
        for index, price in enumerate(prices):
            previous = prices[index - 1]["top"] if index else price["top"] - 50
            following = prices[index + 1]["top"] if index + 1 < len(prices) else price["top"] + 50
            low = (previous + price["top"]) / 2
            high = (price["top"] + following) / 2
            chosen = sorted(
                [word for word in names if low < word["top"] <= high + 0.2],
                key=lambda word: (word["top"], word["x0"]),
            )
            raw = " ".join(word["text"] for word in chosen)
            near = sorted(
                [word for word in numbers if abs(word["top"] - price["top"]) <= 10],
                key=lambda word: abs(word["top"] - price["top"]),
            )
            number = int(near[0]["text"]) if near else None
            rows.append((number, raw, float(price["text"].replace(",", ""))))
    rows.sort(key=lambda row: row[0] or 0)
    return rows


def clean(raw: str, brand: str):
    tokens = raw.replace("PRO/", "PRO ").split()
    code = ""
    phone = "Lainnya"
    rest = []
    for token in tokens:
        if token in BRAND_WORD or token in SKIP:
            continue
        if not code and CODE_RE.match(token):
            code = token
            continue
        mapped = phone_label(token)
        if mapped:
            if phone == "Lainnya":
                phone = mapped
            continue
        rest.append(title_token(token))
    model = re.sub(r"\s+", " ", " ".join(rest)).strip(" /-")
    bits = ["Baterai", brand]
    if code:
        bits.append(code)
    if phone != "Lainnya":
        bits.append(phone)
    if model:
        bits.append(model)
    name = " ".join(bits)
    if len(name) > 150:
        name = name[:150].rstrip()
    compatibility = " ".join(part for part in [None if phone == "Lainnya" else phone, model] if part).strip() or "Universal"
    return name, phone, code, compatibility


def main():
    upload = Path("/home/ubuntu/.cursor/projects/agent-repos-Web-app-Katalog/uploads")
    if not (upload / "list1_4539.pdf").exists():
        upload = ROOT / "data" / "source"
    out = []
    for brand, filename in SOURCES.items():
        rows = parse_pdf(upload / filename)
        numbers = [row[0] for row in rows]
        assert numbers and max(numbers) == len(rows) == len(set(numbers))
        assert all(row[2] > 0 and row[1] for row in rows)
        phones = Counter(clean(row[1], brand)[1] for row in rows)
        print(brand, len(rows), dict(phones))
        for number, raw, price in rows:
            name, phone, code, compatibility = clean(raw, brand)
            out.append(
                {
                    "sku": f"{PREFIX[brand]}-{number:04d}",
                    "nama_produk": name,
                    "merk": brand,
                    "kategori": "Baterai",
                    "subkategori": phone,
                    "het_eceran": int(price) if price == int(price) else price,
                    "modal": 0,
                    "kompatibilitas": compatibility,
                    "spesifikasi": code or "-",
                    "kode_baterai": code,
                    "link_gambar": IMAGE[brand],
                    "status_stok": "In Stock",
                    "tier": "Better",
                }
            )
    assert len({row["sku"] for row in out}) == len(out)
    target = ROOT / "data" / "import" / "import_baterai.csv"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(out[0].keys()))
        writer.writeheader()
        writer.writerows(out)
    print("wrote", len(out), target)


if __name__ == "__main__":
    main()
