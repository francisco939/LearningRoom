# 素材来源与许可

本项目（LearningRoom · 耄耋自习室）的代码以 MIT 许可发布；下列二进制素材按其原始许可使用，单独说明。

> **角色说明**：耄耋是原创致敬角色，灵感来自中文互联网上「上了年纪、脾气不好、眯眼看人」的老橘猫形象。
> 本项目**不使用真实「圆头猫爹 / 圆头耄耋」的影像**，也不包含与虐猫梗相关的内容。
> 默认肖像是一张公有领域的 22 岁老猫照片；用户可在设置里上传自己的图片替换（仅保存在本机）。

## 1. 督学肖像

| 项 | 内容 |
| --- | --- |
| 用途 | 主场景右侧墙上的「耄耋」旧相框；也可作为社交分享图的一部分 |
| 作者 | john gosk |
| 原始页面 | https://www.flickr.com/photos/22708825@N02/2297641934 |
| 原图直链 | https://live.staticflickr.com/3153/2297641934_e2b32f9b82_b.jpg |
| 许可 | **Public Domain Mark 1.0（PDM 1.0）** — https://creativecommons.org/publicdomain/mark/1.0/ |
| 源文件 | `assets-src/cat.jpg`（1024×768，152,589 bytes） |
| 产物 | `public/supervisor/maodie.webp`（720×900，WebP，59,550 bytes） |

处理方式（见 `scripts/prepare-assets.py`）：

1. 裁切框 `(340, 30, 900, 730)`：保留双耳留白、白嘴、胡须和一只前爪，去掉过多被褥与左侧黑色背景。
2. 缩放到 720×900（3:4 竖幅），Lanczos 重采样。
3. 旧照片质感：饱和度 ×0.80、对比度 ×1.05、亮度 ×0.97，再与暖色 `#7a502a` 以 6% 混合。
4. WebP quality 82、method 6。

> PDM 是上传者对「作品已进入公有领域」的标注，并非 CC0 那样的权利放弃声明。若权利人提出异议，请替换为
> `https://live.staticflickr.com/5057/5523655465_d3b4eac71f_b.jpg`（D Coetzee，CC0 1.0），并同步更新本文件。

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
| 作者 | 本项目原创（Pillow 绘制） |
| 许可 | MIT（与代码相同） |
| 产物 | `public/icons/icon-192.png`（12,380 bytes）<br>`public/icons/icon-512.png`（28,939 bytes）<br>`public/icons/maskable-512.png`（23,021 bytes） |

风格：深色底 `#14100d`，暖橙 `#e3a45c` 圆头、深色耳朵、眯眼、白嘴与胡须；无文字。
maskable 版本把内容缩到约 70%，四周留出安全边距，背景铺满。

## 4. 场景与猫脸插画

`src/components/scene/*` 与 `src/components/supervisor/CatFace.tsx` 中的房间、窗景、台灯、书桌、猫脸 SVG
均为本项目原创，随代码以 MIT 发布。没有使用第三方插画或 3D 资产。

字体使用系统字体栈（苹方 / 微软雅黑 / 宋体等），未打包第三方字体。

## 5. 复现

```powershell
# 依赖：Python + Pillow、ffmpeg（PATH 中）
python scripts/prepare-assets.py
```

脚本会：

1. 下载猫图与雨声到 `assets-src/`（已存在则跳过，`--force` 强制重下）。
2. 裁切、调色、压缩肖像。
3. 用 Pillow 重绘三个图标。
4. 调用 ffmpeg 生成 40 秒雨声循环。
5. 打印所有产物的尺寸与字节数。

`assets-src/` 已在 `.gitignore` 中，不随仓库分发；仓库只保留 `public/` 下的成品。

## 6. 未使用 / 已排除

- 真实「圆头猫爹」照片、视频截图、表情包：版权归属原博主，且该梗存在虐猫争议，**不使用**。
- 任何需要署名但未署名的第三方图片、音乐、字体。
- 带水印、来源不明的「免费素材站」图片。
