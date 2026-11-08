#!/usr/bin/env python3
"""LearningRoom · 耄耋自习室 二进制素材处理脚本。

可重复执行：
    python scripts/prepare-assets.py
    python scripts/prepare-assets.py --force   # 重新下载源文件

依赖：Pillow + ffmpeg（PATH 中）。音频会自动做「压缩 → 两遍 loudnorm → AAC」处理。
所有中间文件放在 assets-src/，产物放在 public/。
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import ssl
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
PUBLIC = ROOT / "public"

# 督学肖像由项目作者提供（豆包 AI 生成），不随仓库分发源图；
# 需要重新生成时把原图放到 assets-src/cat-user.jpg（2048×2048）。
CAT_SRC = SRC / "cat-user.jpg"
CAT_OUT = PUBLIC / "supervisor" / "maodie.webp"

# 应用图标源图：作者提供的橘猫照片（601×401，豆包 AI 生成）。
ICON_SRC = SRC / "icon-cat.png"

RAIN_URL = "https://cdn.freesound.org/previews/270/270349_3366749-hq.mp3"
RAIN_SRC = SRC / "rain.mp3"
RAIN_OUT = PUBLIC / "audio" / "rain.m4a"

# 雨声的动态范围很大（峰值 -0.4 dB、均值 -26 dB）。若直接 loudnorm 到 -16 LUFS，
# 为守住 -1.5 dBTP 的峰值，滤波器会把整体压到 -20 LUFS 左右。
# 因此先做压缩/限幅降低波峰因数，再用「两遍 loudnorm（第二遍 linear）」精确归一化。
COMPRESS_FILTER = (
    "acompressor=threshold=0.05:ratio=20:attack=1:release=50:makeup=16,"
    "alimiter=limit=0.7:attack=1:release=50:level=0,"
    "afade=t=in:st=0:d=1,afade=t=out:st=39:d=1"
)

# 40s × 96kbps ≈ 480KB，会超过 450KB 上限；改用 84kbps（约 430KB）。
AUDIO_BITRATE = "84k"

FFMPEG_COMMAND = (
    'pass 1: ffmpeg -y -t 40 -i "assets-src/rain.mp3" -af "'
    + COMPRESS_FILTER
    + '" -ac 1 -ar 44100 "assets-src/rain_comp.wav"\n'
    "pass 2: 测量 rain_comp.wav 的 loudnorm 参数，再用 linear=true 二次归一化，"
    f"编码为 {AUDIO_BITRATE} AAC 单声道"
)

# 原图 2048×2048，底部有字幕与水印；4:5 竖幅（1280×1600）可保留双耳、白嘴与胸口，
# 同时正好裁掉下方「耄耋愤怒」字幕和「豆包 AI 生成」水印。
CAT_CROP = (384, 0, 1664, 1600)
CAT_SIZE = (720, 900)
CAT_QUALITY = 88

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

ICON_BG = (20, 16, 13)  # #14100d
ICON_FUR = (227, 164, 92)  # #e3a45c
ICON_FUR_DARK = (185, 126, 65)
ICON_CREAM = (244, 232, 210)


def download(url: str, dest: Path, force: bool = False) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        print(f"[skip] {dest} ({dest.stat().st_size} bytes)")
        return
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=90) as response:
        data = response.read()
    dest.write_bytes(data)
    print(f"[get ] {dest} ({len(data)} bytes)")


def prepare_portrait() -> None:
    if not CAT_SRC.exists():
        raise SystemExit(f"缺少源图：{CAT_SRC}")

    CAT_OUT.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(CAT_SRC).convert("RGB")
    if image.size != (2048, 2048):
        print(f"[warn] 源图尺寸 {image.size}，脚本按 2048×2048 设计，裁切框可能需要调整")

    left, top, right, bottom = CAT_CROP
    portrait = image.crop((left, top, right, bottom)).resize(CAT_SIZE, Image.LANCZOS)

    # 保留原图的暖色与毛绒质感，只做很轻的对比/饱和调整，避免「旧照片滤镜」感。
    portrait = ImageEnhance.Color(portrait).enhance(1.02)
    portrait = ImageEnhance.Contrast(portrait).enhance(1.03)
    portrait = ImageEnhance.Brightness(portrait).enhance(0.99)

    portrait.save(CAT_OUT, "WEBP", quality=CAT_QUALITY, method=6)
    print(f"[out ] {CAT_OUT} {portrait.size} {CAT_OUT.stat().st_size} bytes")


def draw_cat_icon(canvas: int = 1024, maskable: bool = False) -> Image.Image:
    """在 1024 画布上画一只扁平的老橘猫，再缩放输出。"""
    scale = 0.70 if maskable else 0.92
    image = Image.new("RGB", (canvas, canvas), ICON_BG)
    draw = ImageDraw.Draw(image)

    cx, cy = canvas / 2, canvas / 2 + canvas * 0.045

    def s(value: float) -> float:
        return value * canvas * scale

    # 耳朵（外层深色、内层浅色）
    ear_l = [
        (cx - s(0.19), cy - s(0.20)),
        (cx - s(0.24), cy - s(0.40)),
        (cx - s(0.06), cy - s(0.30)),
    ]
    ear_r = [
        (cx + s(0.19), cy - s(0.20)),
        (cx + s(0.24), cy - s(0.40)),
        (cx + s(0.06), cy - s(0.30)),
    ]
    draw.polygon(ear_l, fill=ICON_FUR_DARK)
    draw.polygon(ear_r, fill=ICON_FUR_DARK)
    inner_l = [
        (cx - s(0.18), cy - s(0.22)),
        (cx - s(0.21), cy - s(0.35)),
        (cx - s(0.09), cy - s(0.29)),
    ]
    inner_r = [
        (cx + s(0.18), cy - s(0.22)),
        (cx + s(0.21), cy - s(0.35)),
        (cx + s(0.09), cy - s(0.29)),
    ]
    draw.polygon(inner_l, fill=(120, 72, 44))
    draw.polygon(inner_r, fill=(120, 72, 44))

    # 头
    r = s(0.26)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ICON_FUR)

    # 白嘴 / 下巴
    mx, my = cx, cy + s(0.10)
    draw.ellipse(
        (mx - s(0.17), my - s(0.13), mx + s(0.17), my + s(0.14)),
        fill=ICON_CREAM,
    )

    # 眯眼：两条向下弯的粗线
    eye_stroke = max(2, int(s(0.022)))
    eye_y = cy - s(0.02)
    draw.arc(
        (cx - s(0.17), eye_y - s(0.06), cx - s(0.04), eye_y + s(0.06)),
        start=200,
        end=340,
        fill=(42, 26, 16),
        width=eye_stroke,
    )
    draw.arc(
        (cx + s(0.04), eye_y - s(0.06), cx + s(0.17), eye_y + s(0.06)),
        start=200,
        end=340,
        fill=(42, 26, 16),
        width=eye_stroke,
    )

    # 鼻子
    nose_y = cy + s(0.075)
    draw.polygon(
        [
            (cx, nose_y + s(0.025)),
            (cx - s(0.028), nose_y - s(0.012)),
            (cx + s(0.028), nose_y - s(0.012)),
        ],
        fill=(150, 78, 52),
    )

    # 嘴
    mouth_stroke = max(2, int(s(0.012)))
    draw.arc(
        (cx - s(0.055), nose_y + s(0.01), cx, nose_y + s(0.075)),
        start=0,
        end=110,
        fill=(90, 58, 40),
        width=mouth_stroke,
    )
    draw.arc(
        (cx, nose_y + s(0.01), cx + s(0.055), nose_y + s(0.075)),
        start=70,
        end=180,
        fill=(90, 58, 40),
        width=mouth_stroke,
    )

    # 胡须
    whisker = max(2, int(s(0.009)))
    for i, dy in enumerate((-0.035, 0.0, 0.035)):
        draw.line(
            [
                (cx - s(0.15), my + s(dy)),
                (cx - s(0.30), my + s(dy - 0.02 + i * 0.02)),
            ],
            fill=(244, 232, 210),
            width=whisker,
        )
        draw.line(
            [
                (cx + s(0.15), my + s(dy)),
                (cx + s(0.30), my + s(dy - 0.02 + i * 0.02)),
            ],
            fill=(244, 232, 210),
            width=whisker,
        )

    # 额头三道浅纹
    stripe = max(2, int(s(0.014)))
    for i, dx in enumerate((-0.06, 0.0, 0.06)):
        draw.line(
            [
                (cx + s(dx), cy - s(0.22)),
                (cx + s(dx * 0.8), cy - s(0.15)),
            ],
            fill=(185, 126, 65),
            width=stripe,
        )

    return image


def prepare_icons() -> None:
    if not ICON_SRC.exists():
        print(f"[skip] 图标源图不存在：{ICON_SRC}（沿用仓库现有图标）")
        return

    icons = PUBLIC / "icons"
    icons.mkdir(parents=True, exist_ok=True)

    image = Image.open(ICON_SRC).convert("RGB")
    # 601×401 原图：裁掉底部水印，保留眯眼、白嘴、吐舌。
    portrait = image.crop((100, 0, 481, 381))
    portrait = ImageEnhance.Contrast(portrait).enhance(1.03)
    portrait = ImageEnhance.Sharpness(portrait).enhance(1.08)
    master = portrait.resize((512, 512), Image.LANCZOS)
    master.save(icons / "icon-512.png", optimize=True)
    master.resize((192, 192), Image.LANCZOS).save(icons / "icon-192.png", optimize=True)
    master.resize((180, 180), Image.LANCZOS).save(icons / "apple-touch-icon.png", optimize=True)
    master.resize((32, 32), Image.LANCZOS).save(icons / "favicon-32.png", optimize=True)
    master.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    maskable = Image.new("RGB", (512, 512), (20, 16, 13))
    maskable.paste(master.resize((410, 410), Image.LANCZOS), (51, 51))
    maskable.save(icons / "maskable-512.png", optimize=True)

    for path in (
        PUBLIC / "favicon.ico",
        icons / "favicon-32.png",
        icons / "apple-touch-icon.png",
        icons / "icon-192.png",
        icons / "icon-512.png",
        icons / "maskable-512.png",
    ):
        with Image.open(path) as check:
            print(f"[out ] {path.relative_to(ROOT)} {check.size} {path.stat().st_size} bytes")


def measure_loudness(ffmpeg: str, path: Path) -> dict[str, str]:
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", result.stderr, re.S)
    if not match:
        raise RuntimeError("无法解析 loudnorm 测量结果")
    return json.loads(match.group(0))


def prepare_audio() -> None:
    """生成 40 秒、首尾淡入淡出的单声道 AAC 循环，并归一化到 -16 LUFS。"""
    if not RAIN_SRC.exists():
        print(f"[warn] 缺少源音频：{RAIN_SRC}，跳过音频")
        return
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("[warn] PATH 中找不到 ffmpeg，跳过音频；可手动执行：")
        print(FFMPEG_COMMAND)
        return

    RAIN_OUT.parent.mkdir(parents=True, exist_ok=True)
    compressed = SRC / "rain_comp.wav"
    pass1 = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-t",
            "40",
            "-i",
            str(RAIN_SRC),
            "-af",
            COMPRESS_FILTER,
            "-ac",
            "1",
            "-ar",
            "44100",
            str(compressed),
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if pass1.returncode != 0:
        print(f"[warn] ffmpeg 压缩失败：{pass1.stderr.strip()[:400]}")
        return

    measured = measure_loudness(ffmpeg, compressed)
    filter_2 = (
        "loudnorm=I=-16:TP=-1.5:LRA=11"
        f":measured_I={measured['input_i']}"
        f":measured_TP={measured['input_tp']}"
        f":measured_LRA={measured['input_lra']}"
        f":measured_thresh={measured['input_thresh']}"
        f":offset={measured['target_offset']}"
        ":linear=true"
    )
    pass2 = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(compressed),
            "-af",
            filter_2,
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "aac",
            "-b:a",
            AUDIO_BITRATE,
            str(RAIN_OUT),
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if pass2.returncode != 0:
        print(f"[warn] ffmpeg 归一化失败：{pass2.stderr.strip()[:400]}")
        return

    final = measure_loudness(ffmpeg, RAIN_OUT)
    size = RAIN_OUT.stat().st_size
    print(
        f"[out ] {RAIN_OUT} {size} bytes  "
        f"I={final['input_i']} LUFS  TP={final['input_tp']} dBTP"
    )
    if size > 450 * 1024:
        print("[warn] 音频超过 450KB，请降低码率或缩短时长")
    compressed.unlink(missing_ok=True)


def report() -> None:
    print("\n产物：")
    total = 0
    for path in (
        CAT_OUT,
        RAIN_OUT,
        PUBLIC / "favicon.ico",
        PUBLIC / "icons" / "favicon-32.png",
        PUBLIC / "icons" / "apple-touch-icon.png",
        PUBLIC / "icons" / "icon-192.png",
        PUBLIC / "icons" / "icon-512.png",
        PUBLIC / "icons" / "maskable-512.png",
    ):
        if path.exists():
            total += path.stat().st_size
            print(f"  {path.relative_to(ROOT)}  {path.stat().st_size} bytes")
        else:
            print(f"  [missing] {path.relative_to(ROOT)}")
    print(f"  合计 {total} bytes")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="重新下载源文件")
    args = parser.parse_args()

    SRC.mkdir(parents=True, exist_ok=True)
    if not CAT_SRC.exists():
        raise SystemExit(
            f"缺少督学源图：{CAT_SRC}\n"
            "请把作者提供的 2048×2048 原图放到这个位置，或只重新生成雨声/图标时先手动跳过肖像。"
        )
    download(RAIN_URL, RAIN_SRC, force=args.force)
    prepare_portrait()
    prepare_icons()
    prepare_audio()
    print(f"\n音频命令（等价）：\n  {FFMPEG_COMMAND}")
    report()
    return 0


if __name__ == "__main__":
    sys.exit(main())
