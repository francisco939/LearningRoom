# 动态图集资源

- `images/01.webp … 20.webp`：20 张 Pexels 免费静图，16:9，1600×900。
- `videos/`：10 段 720p 视频（5 段 Pexels + 5 段作者提供的美丽风景），H.264、无音轨、首尾可循环。
  - `pexels-01 … 05`
  - `user-01 … 05`
- `posters/`：对应 poster，16:9。
- 视频压缩后总计约 15MB。PWA 不预缓存 `gallery/**`，只按需加载。

## 可选：迁移到 R2

当前视频随仓库发布，GitHub Pages 可直接使用，**不需要 Cloudflare 登录**。等 Cloudflare 环境可用后：

```bash
cd server && npx wrangler login
node ../scripts/upload-gallery.mjs
```

并在前端构建时设置 `VITE_MEDIA_BASE=https://media.learningroom.dpdns.org`，即可切到 R2。

## TODO(cloudflare)

Cloudflare 登录、D1/R2/DO 创建和 Resend DNS 目前未配置；后端与在线人数在配置前会降级。步骤见 `server/README.md`。
