#!/usr/bin/env python3
"""Genere icons/icon.svg et les PNG derives (180, 192, 512, 512 maskable).

Aucune dependance : la geometrie est decrite une fois puis rendue soit en SVG,
soit en PNG par echantillonnage (zlib pour la compression).

    python3 tools/make_icons.py
"""

import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

INK = (0x08, 0x15, 0x1D)
INK_TOP = (0x12, 0x30, 0x3E)
STEEL = (0x1E, 0x3E, 0x4D)
BAR_HI = (0xE9, 0xF2, 0xF1)
BAR_MID = (0xB7, 0xCF, 0xD9)
BAR_LO = (0x82, 0xA3, 0xB1)
FLARE = (0xFF, 0xB0, 0x2E)

S = 512.0                      # repere de reference
UPRIGHT = dict(w=30.0, y0=104.0, y1=436.0, r=15.0, x_left=96.0, x_right=386.0)
BAR = dict(x0=64.0, x1=448.0, y0=150.0, y1=190.0, r=20.0)
CHEVRON = dict(apex=(256.0, 232.0), left=(176.0, 338.0), right=(336.0, 338.0), t=19.0)
RACK_STEP = 46.0
CORNER = 112.0                 # rayon des coins pour les icones "any"


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def rounded_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def thick_segment(x, y, ax, ay, bx, by, t):
    dx, dy = bx - ax, by - ay
    den = dx * dx + dy * dy
    u = 0.0 if den == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / den))
    px, py = ax + u * dx, ay + u * dy
    return (x - px) ** 2 + (y - py) ** 2 <= t * t


def sample(x, y, maskable):
    """Couleur RGBA du point (x, y) exprime dans le repere 512."""
    if maskable:
        cx = cy = S / 2
        x = cx + (x - cx) / 0.74
        y = cy + (y - cy) / 0.74
        inside = 0.0 <= x <= S and 0.0 <= y <= S
        if not inside:
            x = min(max(x, 0.0), S)
            y = min(max(y, 0.0), S)
    elif not rounded_rect(x, y, 0, 0, S, S, CORNER):
        return (0, 0, 0, 0)

    # Fond : degrade radial vers le haut + filet de lignes horizontales.
    d = math.hypot(x - S / 2, y - 70.0) / 430.0
    col = lerp(INK_TOP, INK, min(1.0, d))
    if (y % RACK_STEP) < 2.0:
        col = lerp(col, (255, 255, 255), 0.03)

    u = UPRIGHT
    for x0 in (u["x_left"], u["x_right"]):
        if rounded_rect(x, y, x0, u["y0"], x0 + u["w"], u["y1"], u["r"]):
            col = STEEL

    c = CHEVRON
    if thick_segment(x, y, c["left"][0], c["left"][1], c["apex"][0], c["apex"][1], c["t"]) or \
       thick_segment(x, y, c["right"][0], c["right"][1], c["apex"][0], c["apex"][1], c["t"]):
        col = FLARE

    b = BAR
    if rounded_rect(x, y, b["x0"], b["y0"], b["x1"], b["y1"], b["r"]):
        t = (y - b["y0"]) / (b["y1"] - b["y0"])
        col = lerp(BAR_HI, BAR_MID, t / 0.45) if t < 0.45 else lerp(BAR_MID, BAR_LO, (t - 0.45) / 0.55)

    return (int(col[0] + 0.5), int(col[1] + 0.5), int(col[2] + 0.5), 255)


def render(size, maskable=False, ss=3):
    scale = S / size
    inv = 1.0 / (ss * ss)
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                y = (py + (sy + 0.5) / ss) * scale
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) * scale
                    sr, sg, sb, sa = sample(x, y, maskable)
                    r += sr * sa
                    g += sg * sa
                    b += sb * sa
                    a += sa
            if a == 0:
                row += b"\x00\x00\x00\x00"
            else:
                row += bytes((int(r / a + 0.5), int(g / a + 0.5), int(b / a + 0.5), int(a * inv / 255 * 255 + 0.5)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Barre de traction">
  <defs>
    <radialGradient id="bg" cx="50%" cy="14%" r="84%">
      <stop offset="0" stop-color="#12303E"/>
      <stop offset="1" stop-color="#08151D"/>
    </radialGradient>
    <linearGradient id="steelbar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E9F2F1"/>
      <stop offset="0.45" stop-color="#B7CFD9"/>
      <stop offset="1" stop-color="#82A3B1"/>
    </linearGradient>
    <pattern id="rack" width="512" height="46" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="512" height="2" fill="#ffffff" opacity="0.03"/>
    </pattern>
    <clipPath id="round"><rect x="0" y="0" width="512" height="512" rx="112" ry="112"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#rack)"/>
    <rect x="96" y="104" width="30" height="332" rx="15" fill="#1E3E4D"/>
    <rect x="386" y="104" width="30" height="332" rx="15" fill="#1E3E4D"/>
    <path d="M176 338 L256 232 L336 338" fill="none" stroke="#FFB02E" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="64" y="150" width="384" height="40" rx="20" fill="url(#steelbar)"/>
  </g>
</svg>
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "icon.svg"), "w", encoding="utf-8") as fh:
        fh.write(SVG)
    for name, size, maskable in (
        ("apple-touch-icon-180.png", 180, True),
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
    ):
        path = os.path.join(OUT, name)
        write_png(path, size, render(size, maskable))
        print(name, os.path.getsize(path), "octets")


if __name__ == "__main__":
    main()
