#!/usr/bin/env python3
"""Draw the original extension icons: a cream speech bubble and an amber spark on ink."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INK = (28, 36, 48, 255)
CREAM = (243, 212, 138, 255)
SPARK = (224, 122, 61, 255)
LINE = (28, 36, 48, 255)

SAMPLES = 4


def inside_round_rect(px: float, py: float, x: float, y: float, w: float, h: float, r: float) -> bool:
    if px < x or py < y or px >= x + w or py >= y + h:
        return False
    dx = 0.0
    if px < x + r:
        dx = x + r - px
    elif px > x + w - r:
        dx = px - (x + w - r)
    dy = 0.0
    if py < y + r:
        dy = y + r - py
    elif py > y + h - r:
        dy = py - (y + h - r)
    return dx * dx + dy * dy <= r * r


def inside_circle(px: float, py: float, cx: float, cy: float, r: float) -> bool:
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def inside_triangle(px: float, py: float, a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> bool:
    def sign(p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float]) -> float:
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    d1 = sign((px, py), a, b)
    d2 = sign((px, py), b, c)
    d3 = sign((px, py), c, a)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def color_at(px: float, py: float, size: float) -> tuple[int, int, int, int]:
    margin = size * 0.04
    if not inside_round_rect(px, py, margin, margin, size - margin * 2, size - margin * 2, size * 0.22):
        return (0, 0, 0, 0)

    bubble = inside_round_rect(px, py, size * 0.18, size * 0.16, size * 0.64, size * 0.48, size * 0.12)
    tail = inside_triangle(
        px,
        py,
        (size * 0.28, size * 0.58),
        (size * 0.46, size * 0.58),
        (size * 0.30, size * 0.78),
    )
    if bubble or tail:
        thickness = max(1.0, size * 0.045)
        lines = (
            (size * 0.28, size * 0.30, size * 0.70),
            (size * 0.28, size * 0.40, size * 0.70),
            (size * 0.28, size * 0.50, size * 0.56),
        )
        for x0, y0, x1 in lines:
            if x0 <= px <= x1 and abs(py - y0) <= thickness / 2:
                return LINE
        return CREAM

    if inside_circle(px, py, size * 0.72, size * 0.72, size * 0.09):
        return SPARK
    return INK


def coverage(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    acc = [0, 0, 0, 0]
    hits = 0
    for sy in range(SAMPLES):
        for sx in range(SAMPLES):
            color = color_at(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES, size)
            if color[3] == 0:
                continue
            hits += 1
            for channel in range(3):
                acc[channel] += color[channel]
    if hits == 0:
        return (0, 0, 0, 0)
    total = SAMPLES * SAMPLES
    return (
        acc[0] // hits,
        acc[1] // hits,
        acc[2] // hits,
        round(255 * hits / total),
    )


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(coverage(x, y, size))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main() -> None:
    icon_dir = ROOT / "apps" / "extension" / "public" / "icon"
    for size in (16, 32, 48, 128):
        write_png(icon_dir / f"{size}.png", size)
    web_icon = ROOT / "apps" / "web" / "app" / "icon.png"
    web_icon.write_bytes((icon_dir / "32.png").read_bytes())
    print(f"wrote icons in {icon_dir} and {web_icon}")


if __name__ == "__main__":
    main()
