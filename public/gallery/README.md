# 动态图集资源

- `images/01.webp … 20.webp`：20 张 Pexels 免费静图，16:9，1600×900。
- `posters/`：所有视频的 poster（含 5 个待提供的 user 占位）。
- `videos/`：本地开发时临时放 `pexels-01 … 05.mp4`；已被 `.gitignore` 忽略。
  生产环境视频在 R2 `gallery/videos/`。

## 待作者提供：5 段 user 动态

文件名：`user-01.mp4 … user-05.mp4`

要求：16:9、1280×720 或 1080p、6–10 秒、无音轨、首尾可循环、无文字/水印。
放到 `assets-src/gallery-src/videos/` 后运行：

```bash
python scripts/prepare-gallery.py
node scripts/upload-gallery.mjs
```

`public/gallery/posters/user-*.webp` 目前是静图占位；提供视频后会被自动覆盖。
