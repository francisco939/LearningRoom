# 素材来源与许可

本项目（LearningRoom · 耄耋自习室）的代码以 MIT 许可发布；下列二进制素材按其原始许可使用，单独说明。

> **角色说明**：耄耋是原创致敬角色，灵感来自中文互联网上「上了年纪、脾气不好、眯眼看人」的老橘猫形象。
> 本项目**不使用真实「圆头猫爹 / 圆头耄耋」的影像**，也不包含与虐猫梗相关的内容。
> 默认肖像由项目作者提供（豆包 AI 生成）；用户也可在设置里上传自己的图片替换（仅保存在本机）。

## 1. 督学肖像

| 项 | 内容 |
| --- | --- |
| 用途 | 主场景右侧墙上的「耄耋」相框；也可作为社交分享图的一部分 |
| 来源 | **项目作者提供**的 AI 生成图片（豆包 AI 生成） |
| 权利 | 作者保留权利；仅用于本项目，不在 MIT 代码许可范围内 |
| 源文件 | `assets-src/cat-user.jpg`（2048×2048，不随仓库分发） |
| 产物 | `public/supervisor/maodie.webp`（720×900，4:5，WebP，45,106 bytes） |

处理方式（见 `scripts/prepare-assets.py`）：

1. 裁切框 `(384, 0, 1664, 1600)`：保留双耳、白嘴、胡须与胸口，同时裁掉底部「耄耋愤怒」字幕和「豆包 AI 生成」水印。
2. 缩放到 720×900（4:5 竖幅），Lanczos 重采样。
3. 只做很轻的调色：饱和度 ×1.02、对比度 ×1.03、亮度 ×0.99，保留原图暖色与毛绒质感。
4. WebP quality 88、method 6。

> 首页/引导里也可以替换成自己的图：设置 → 督学形象 → 上传图片，图片只保存在本机 IndexedDB，不会进入仓库。

**探头贴纸** `public/supervisor/maodie-peek.webp`（620×513，透明 WebP，51,606 bytes）：
从同一张原图裁出头+上胸，用 `rembg`（u2net）去背景，收边后加奶油色贴纸描边，并把底部 18% 渐隐，作为巡查视频缺失时的回退。
`rembg` 模型与依赖不随仓库分发；这一步是一次性处理，未纳入 `scripts/prepare-assets.py`（该脚本只负责肖像/图标/雨声）。

## 2. 雨声循环

| 项 | 内容 |
| --- | --- |
| 用途 | 专注时的环境雨声，循环播放，可关闭/调音量 |
| 作者 | seth-m |
| 原始页面 | https://freesound.org/people/seth-m/sounds/270349 |
| 原始直链 | https://cdn.freesound.org/previews/270/270349_3366749-hq.mp3 |
| 许可 | **CC0 1.0** — https://creativecommons.org/publicdomain/zero/1.0/ |
| 源文件 | `assets-src/rain.mp3`（5,169,456 bytes，约 210 秒） |
| 产物 | `public/audio/rain.m4a`（40.0 秒，AAC-LC，44.1kHz，单声道，432,444 bytes） |
| 最终响度 | **-16.06 LUFS**，真峰值 **-2.69 dBTP**（ffmpeg loudnorm 实测） |

处理方式（脚本会分两遍调用 ffmpeg）：

```bash
# pass 1：压缩 + 限幅 + 首尾 1 秒淡入淡出
FILTER1="acompressor=threshold=0.05:ratio=20:attack=1:release=50:makeup=16,alimiter=limit=0.7:attack=1:release=50:level=0,afade=t=in:st=0:d=1,afade=t=out:st=39:d=1"
ffmpeg -y -t 40 -i "assets-src/rain.mp3" -af "$FILTER1" -ac 1 -ar 44100 "assets-src/rain_comp.wav"

# pass 2：先测量 rain_comp.wav，把 measured_* 填进下面，再用 linear=true 精确归一化
FILTER2="loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-14.65:measured_TP=-2.90:measured_LRA=0.8:measured_thresh=-24.7:offset=-0.01:linear=true"
ffmpeg -y -i "assets-src/rain_comp.wav" -af "$FILTER2" -ac 1 -ar 44100 -c:a aac -b:a 84k "public/audio/rain.m4a"
```

> 上面的 `measured_*` 是本次源文件的值；换源后需要重新测量。`scripts/prepare-assets.py` 会自动完成这两步。

### 2.1 哈气声

| 项 | 内容 |
| --- | --- |
| 用途 | 耄耋张嘴哈气时的音效 |
| 作者 | Zabuhailo |
| 原始页面 | https://commons.wikimedia.org/wiki/File:Cat_hissing_-_Zabuhailo.wav |
| 许可 | **CC0 1.0** |
| 源文件 | `assets-src/audio/cat-hiss.wav`（2.3 秒真实猫哈气） |
| 产物 | `public/audio/hiss.m4a`（1.4 秒，AAC-LC，单声道，15,672 bytes） |

处理：截取 0.2–1.6 秒，loudnorm 到 -18 LUFS，首尾淡入淡出。`Ambience.hiss()` 优先播放它，失败时才用 Web Audio 合成噪声兜底。

- 雨声原始动态很大（峰值 -0.4 dB、均值 -26 dB）。直接 single-pass `loudnorm` 时，为了守住
  -1.5 dBTP 会把整体压到 -20 LUFS 左右；因此先压缩/限幅降低波峰因数，再用两遍 `loudnorm`
  （第二遍 `linear=true`）精确落到 -16 LUFS。
- 首尾各 1 秒淡入淡出，降低循环接缝的爆音。
- **码率说明**：40 秒 × 96kbps ≈ 480KB，会超过「≤450KB」的限制，因此改用 84kbps（432KB）；
  时长、采样率、声道数与两遍归一化流程保持不变。
- 压缩会让雨声更「稳定」，换来的是无需用户调音量就能听清，同时不削波。

## 3. 应用图标

| 项 | 内容 |
| --- | --- |
| 用途 | PWA 图标、favicon、apple-touch-icon、maskable 图标 |
| 来源 | 项目作者提供的橘猫照片（豆包 AI 生成），裁成方形头像 |
| 许可 | 作者保留权利，仅用于本项目；**不随 MIT 代码许可** |
| 产物 | `public/favicon.ico`（16/32/48）<br>`public/icons/favicon-32.png`<br>`public/icons/icon-192.png`<br>`public/icons/icon-512.png`<br>`public/icons/apple-touch-icon.png`（180×180）<br>`public/icons/maskable-512.png` |

处理：从 `assets-src/icon-cat.png` 取 `(100, 0, 481, 381)` 方形裁切，保留眯眼、白嘴和吐舌，去掉底部水印，缩放到 512。
maskable 版本把头像缩到 410×410，居中放在 `#14100d` 背景上，留出安全边距。

## 4. 场景与猫脸插画

`src/components/scene/*` 与 `src/components/supervisor/CatFace.tsx` 中的房间、窗景、台灯、书桌、猫脸 SVG
均为本项目原创，随代码以 MIT 发布；它们是高清场景图缺失时的回退。

`public/scenes/` 下的三张高清场景图由项目作者用 Seedream 生成，提示词见
[`docs/scene-prompts.md`](docs/scene-prompts.md)：

| 文件 | 内容 | 规格 |
| --- | --- | --- |
| `rainy-study.webp` | 雨夜书房 | 2560×1440，WebP，206,258 bytes |
| `dusk-library.webp` | 黄昏图书馆 | 2560×1440，WebP，223,518 bytes |
| `dawn-desk.webp` | 清晨书桌 | 2560×1440，WebP，184,140 bytes |

三张图都裁掉了右下角「豆包 AI 生成」水印（裁掉右侧 240px、底部 133px 后统一到 16:9）。
这些图片不随 MIT 代码许可发布，仅用于本项目；缺失时自动使用 SVG 场景。

界面字体使用 **Fraunces Variable**（拉丁/数字）与 **Manrope Variable**（UI 拉丁），通过 `@fontsource-variable` 打包，许可均为 **SIL OFL 1.1**；中文回退到系统宋体/苹方。

## 5. 巡查帧动画

`peek-src.mp4` / `yell-src.mp4` 由项目作者用 Seedream 图生视频生成（720×720，10 秒，绿幕），
提示词见 [`docs/video-prompts.md`](docs/video-prompts.md)。仓库不直接播放 MP4，而是切成帧并预抠像：

| 文件 | 内容 | 规格 |
| --- | --- | --- |
| `peek-sheet.webp` + `peek.json` | 探头：83 帧 | 15fps，单帧 280×280，2800×2520，412,994 bytes |
| `yell-sheet.webp` + `yell.json` | 哈气：73 帧 | 15fps，单帧 280×280，2800×2240，556,748 bytes |

处理脚本：[`scripts/prepare-video-frames.py`](scripts/prepare-video-frames.py)：抽帧 → HSV 绿色连通域抠像 → 收边/羽化/去绿溢 → 拼 sprite sheet。
源视频与中间帧在 `assets-src/video/`，已被 `.gitignore` 忽略；仓库只保留成品。

- 眼睛等内部绿色不会被误抠，因为只保留与画面边缘连通的绿色区域。
- 右下角「豆包 AI 生成」水印在抠像前先替换成背景绿并清掉 alpha。
- 帧没加载到时回退到 `maodie-peek.webp` 静态贴纸。
- 权利归项目作者，仅用于本项目。

## 6. 复现

```powershell
# 依赖：Python + Pillow、ffmpeg（PATH 中）
python scripts/prepare-assets.py
```

脚本会：

1. 读取 `assets-src/cat-user.jpg`（作者提供的原图），裁切/调色/压缩肖像。
2. 下载雨声、做两遍 loudnorm、生成 40 秒循环。
3. 用 Pillow 重绘三个图标。
4. 打印所有产物的尺寸与字节数。

巡查帧需要额外两步（源视频放 `assets-src/video/`）：

```bash
# 抽帧（时间范围见 docs/video-prompts.md）
ffmpeg -y -ss 0 -t 5.5 -i assets-src/video/peek-src.mp4 -vf "fps=15,scale=280:280" assets-src/video/frames-peek/%03d.png
ffmpeg -y -ss 1.0 -t 4.8 -i assets-src/video/yell-src.mp4 -vf "fps=15,scale=280:280" assets-src/video/frames-yell/%03d.png
```

```powershell
$env:PYTHONPATH = "D:\code\LearningRoom\.pydeps"
python scripts/prepare-video-frames.py
```

`assets-src/`、`.pydeps/`、`.models/` 已在 `.gitignore` 中，不随仓库分发；仓库只保留 `public/` 下的成品。

## 7. 未使用 / 已排除

- 真实「圆头猫爹」照片、视频截图、表情包：版权归属原博主，且该梗存在虐猫争议，**不使用**。
- 任何需要署名但未署名的第三方图片、音乐、字体。
- 带水印、来源不明的「免费素材站」图片。
