#!/usr/bin/env python3
"""把绿幕视频切成帧，抠掉绿背景，拼成 sprite sheet。

用法：
    python scripts/prepare-video-frames.py

输入：
    assets-src/video/frames-peek/*.png   （已经用 ffmpeg 按 15fps 抽好的帧）
    assets-src/video/frames-yell/*.png

输出：
    public/supervisor/peek-sheet.webp
    public/supervisor/yell-sheet.webp
    public/supervisor/peek.json / yell.json

依赖：Pillow、numpy、scipy
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_dilation, label

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "video"
OUT = ROOT / "public" / "supervisor"

CELL = 280
COLS = 10
FPS = 15


def background_mask(rgb: np.ndarray) -> np.ndarray:
    hsv = np.array(Image.fromarray(rgb, "RGB").convert("HSV"))
    h = hsv[:, :, 0].astype(np.int16)
    s = hsv[:, :, 1].astype(np.int16)
    v = hsv[:, :, 2].astype(np.int16)
    candidate = (h >= 82) & (h <= 155) & (s >= 50) & (v >= 35)
    candidate = binary_dilation(candidate, iterations=1)

    labels, count = label(candidate)
    if count == 0:
        return np.zeros(candidate.shape, dtype=bool)

    border = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    keep = {int(x) for x in np.unique(border) if x > 0}
    if not keep:
        return np.zeros(candidate.shape, dtype=bool)
    return np.isin(labels, list(keep))


def process_frame(path: Path) -> Image.Image:
    rgb = np.array(Image.open(path).convert("RGB"))

    # 右下角的「豆包 AI 生成」水印：把低饱和的亮字替换成背景绿，再参与抠像。
    h, w = rgb.shape[:2]
    region = rgb[int(h * 0.85) :, int(w * 0.75) :].astype(np.int16)
    mx = region.max(axis=2)
    mn = region.min(axis=2)
    white = (mn > 115) & ((mx - mn) < 50)
    if white.any():
        bg = rgb[4, 4].astype(np.int16)
        region[white] = bg
        rgb[int(h * 0.85) :, int(w * 0.75) :] = region.astype(np.uint8)

    bg_mask = background_mask(rgb)
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)

    # 水印残留（少量蓝色/灰色像素）直接清掉，避免抠像后留下小字。
    alpha[int(h * 0.86) :, int(w * 0.78) :] = 0

    # 收边 + 轻微羽化，避免绿边
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.MinFilter(3))
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.55))
    alpha = np.array(alpha_img)

    # 绿溢色抑制：绿色通道不超过红蓝均值太多
    g = rgb[:, :, 1].astype(np.int16)
    rb = (rgb[:, :, 0].astype(np.int16) + rgb[:, :, 2].astype(np.int16)) // 2
    spill = alpha > 0
    g[spill] = np.minimum(g[spill], rb[spill] + 10)

    out = np.dstack([rgb[:, :, 0], g.astype(np.uint8), rgb[:, :, 2], alpha])
    return Image.fromarray(out, "RGBA")


def build(name: str, src_dir: Path) -> None:
    frames = sorted(src_dir.glob("*.png"))
    if not frames:
        raise SystemExit(f"没有帧：{src_dir}")

    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))

    for index, path in enumerate(frames):
        frame = process_frame(path)
        if frame.size != (CELL, CELL):
            frame = frame.resize((CELL, CELL), Image.LANCZOS)
        x = (index % COLS) * CELL
        y = (index // COLS) * CELL
        sheet.alpha_composite(frame, (x, y))

    OUT.mkdir(parents=True, exist_ok=True)
    sheet_path = OUT / f"{name}-sheet.webp"
    sheet.save(sheet_path, "WEBP", quality=84, method=6)

    manifest = {"fps": FPS, "cell": CELL, "cols": COLS, "rows": rows, "count": len(frames)}
    (OUT / f"{name}.json").write_text(json.dumps(manifest), encoding="utf-8")
    print(f"{name}: {len(frames)} frames, {sheet.size}, {sheet_path.stat().st_size} bytes")


if __name__ == "__main__":
    build("peek", SRC / "frames-peek")
    build("yell", SRC / "frames-yell")
