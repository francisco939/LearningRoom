#!/usr/bin/env python3
"""准备 30 项动态图集的静态图、视频 poster 和 R2 上传产物。

输入（不提交）：
    assets-src/gallery-src/static/01.jpg ... 20.jpg
    assets-src/gallery-src/videos/pexels-01.mp4 ... pexels-05.mp4
    assets-src/gallery-src/videos/user-01.mp4 ... user-05.mp4
    assets-src/ASSET-CREDITS.json（可选）

输出：
    public/gallery/images/01.webp ... 20.webp      16:9，1600×900
    public/gallery/posters/*.webp                  16:9，640×360
    assets-src/gallery-out/videos/*.mp4            1280×720，H.264，无音轨（用于 R2）
    public/gallery/manifest.json                   生成用 manifest（可选）

依赖：Pillow + ffmpeg。
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "gallery-src"
IMAGES = ROOT / "public" / "gallery" / "images"
POSTERS = ROOT / "public" / "gallery" / "posters"
VIDEO_OUT = ROOT / "assets-src" / "gallery-out" / "videos"
MANIFEST = ROOT / "public" / "gallery" / "manifest.json"

TARGET_SIZE = (1600, 900)
POSTER_SIZE = (640, 360)


def static_image(src: Path, dst: Path) -> None:
    image = Image.open(src).convert("RGB")
    image = ImageOps.fit(image, TARGET_SIZE, Image.LANCZOS, centering=(0.5, 0.45))
    image = ImageEnhance.Color(image).enhance(0.96)
    image.save(dst, "WEBP", quality=82, method=6)
    poster = ImageOps.fit(image, POSTER_SIZE, Image.LANCZOS)
    poster.save(POSTERS / f"{dst.stem}.webp", "WEBP", quality=78, method=6)


def video(src: Path, dst: Path, poster: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("[skip] 找不到 ffmpeg，跳过视频")
        return
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(src),
            "-t",
            "8",
            "-vf",
            "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(dst),
        ],
        check=True,
    )
    subprocess.run(
        [ffmpeg, "-y", "-ss", "0.5", "-i", str(dst), "-frames:v", "1", str(poster.with_suffix(".jpg"))],
        check=True,
    )
    Image.open(poster.with_suffix(".jpg")).convert("RGB").resize(
        POSTER_SIZE, Image.LANCZOS
    ).save(poster, "WEBP", quality=78, method=6)
    poster.with_suffix(".jpg").unlink(missing_ok=True)


def main() -> None:
    for directory in (IMAGES, POSTERS, VIDEO_OUT):
        directory.mkdir(parents=True, exist_ok=True)

    made: list[str] = []
    for index in range(1, 21):
        src = SRC / "static" / f"{index:02d}.jpg"
        if not src.exists():
            src = SRC / "static" / f"{index:02d}.png"
        if not src.exists():
            print(f"[skip] 缺少静态图 {src}")
            continue
        dst = IMAGES / f"{index:02d}.webp"
        static_image(src, dst)
        made.append(f"image-{index:02d}")
        print(f"[out ] {dst.relative_to(ROOT)} {dst.stat().st_size}")

    for group in ("pexels", "user"):
        for index in range(1, 6):
            src = SRC / "videos" / f"{group}-{index:02d}.mp4"
            if not src.exists():
                print(f"[skip] 缺少视频 {src}")
                continue
            dst = VIDEO_OUT / f"{group}-{index:02d}.mp4"
            poster = POSTERS / f"{group}-{index:02d}.webp"
            video(src, dst, poster)
            made.append(f"{group}-{index:02d}")
            print(f"[out ] {dst.relative_to(ROOT)} {dst.stat().st_size}")

    credits = ROOT / "assets-src" / "ASSET-CREDITS.json"
    MANIFEST.write_text(
        json.dumps(
            {
                "generatedAt": __import__("datetime").datetime.now().isoformat(),
                "items": made,
                "credits": json.loads(credits.read_text(encoding="utf-8"))
                if credits.exists()
                else [],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"[out ] {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
