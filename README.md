# LearningRoom · 耄耋自习室

> 一只退休的监学猫，陪你把这一轮坐完。

一个**混合型单人在线自习室**：Stillwhere 式的场景与计时氛围，加一点 Redwatch 式的巡查压力——监督者换成一只上了年纪的橘猫「耄耋」，而且**不碰摄像头**。

浏览器打开即用，无需登录；记录只保存在本机。

**状态**：单人本地 MVP 已完成，线上 GitHub Pages 已部署并验证可访问：`https://francisco939.github.io/LearningRoom/`。首次打开如果仍是旧空白页，用无痕窗口或 Ctrl+Shift+R 强制刷新。

[接手项目？先读交接文档 →](docs/HANDOFF.md) · [玩法与状态机](docs/product.md) · [素材与许可](ASSETS.md)

![主界面](docs/screenshots/hero.webp)

## 这是什么

- **场景**：雨夜书房 / 黄昏图书馆 / 清晨书桌，三张 16:9 高清 Seedream 场景；加载失败时回退到原创 SVG 房间。
- **计时**：番茄钟 / 倒计时 / 秒表，可自定义时长、轮数、自动开始休息。
- **耄耋突袭**：专注中老猫会不定时从窗边或屏幕边缘探头，15 秒内按空格或点「喵」；切走标签页超时，它会张嘴哈气、扣星，三颗星扣光这一轮作废。
- **自定义督学**：相框下方的名字可以自己起（最多 8 个字），也可以上传自己的猫图替换肖像；只保存在本机。
- **纯自习模式**：设置里可关闭「启用耄耋监督」——猫、探头、查岗、扣星和等级条全部隐藏，计时、场景、记录照常。
- **只监督在场**：不打开摄像头、不读屏幕，只看标签页可见性、键鼠活动和是否应声。
- **成长**：小鱼干、连续天数、5 级「猫的认可」、13 个成就、专注历史与 7 日统计。
- **离线可用**：PWA，可安装到桌面/主屏；断网后第二次打开仍能继续。

| 场景（Seedream 高清） | 巡查（帧动画） |
| --- | --- |
| ![黄昏图书馆](docs/screenshots/library.webp) | ![耄耋查岗](docs/screenshots/patrol.webp) |

| 完成结算 | 成就 |
| --- | --- |
| ![完成](docs/screenshots/complete.webp) | ![成就](docs/screenshots/achievements.webp) |

<details>
<summary>更多截图：引导、清晨书桌、设置、历史</summary>

| 引导 | 清晨书桌 |
| --- | --- |
| ![引导](docs/screenshots/onboarding.webp) | ![清晨](docs/screenshots/dawn.webp) |

| 设置 | 历史 |
| --- | --- |
| ![设置](docs/screenshots/settings.webp) | ![历史](docs/screenshots/history.webp) |

</details>

## 快速开始

需要 Node 20.19+ / 22.12+ / 24。

```bash
npm install
npm run dev
```

打开 `http://localhost:5173`。

```bash
npm run test     # 单元测试（82 个用例）
npm run lint     # ESLint
npm run build    # 类型检查 + 生产构建
npm run verify   # lint + test + build（提交前跑）
npm run preview  # 预览生产构建
```

> Windows / DSH 沙箱里 npm 缓存可能 `EPERM`：先设 `$env:npm_config_cache = "$PWD\.npm-cache"`。
> Vite 构建如果需要 esbuild 子进程，沙箱下要给命令完整权限。更多坑见 [HANDOFF.md](docs/HANDOFF.md#52-windows--dsh-沙箱的坑重要)。

## 玩法一屏

| 项 | 规则 |
| --- | --- |
| 星级 | 每场 3 颗；离座 / 查岗未应各扣 1 颗；同类违规 30 秒冷却 |
| 巡查间隔 | 宽松 8–15 分钟 / 标准 4–8 分钟 / 严格 2–4 分钟；首轮 60–120 秒 |
| 离座判定 | 标签页隐藏超过宽限（90 / 45 / 20 秒） |
| 查岗 | 气泡出现后 15 秒内回应，超时扣星 |
| 无操作 | 只触发查岗，不直接扣星（避免「在看书」误判） |
| 纯自习模式 | 关闭「启用耄耋监督」后：无探头/查岗/扣星，计时、记录、场景照常 |
| 小鱼干 | 完成：`floor(专注秒数 / 600) + 剩余星数`；失败 0；主动中止半速 |
| 连续天数 | 只算「完成」的场次；业务日按本地时间 **04:00** 切换 |
| 等级 | 0 / 5h / 20h / 50h / 100h → 陌生猫 / 面熟 / 常客 / 猫友 / 耄耋认可 |

更细的状态机、公式、存储结构见 [docs/product.md](docs/product.md)。

## 技术栈

- **Vite 7 + React 19 + TypeScript**
- **Tailwind CSS 4**（`@theme` 设计令牌）+ 手写场景/动画 CSS
- **Fraunces Variable + Manrope Variable**（拉丁/数字，OFL），中文回退系统宋体/苹方
- **Zustand**：设置 / 进度 / 会话三套 store
- **vite-plugin-pwa**：离线缓存 + 安装
- 场景用高清图 + SVG 回退；巡查用 **sprite sheet + canvas 逐帧播放**
- 音频：HTMLAudioElement 雨声/哈气 + Web Audio 提示音
- 测试：Vitest + jsdom

首屏 JS 约 **97 KB gzip**；PWA 预缓存约 **2.56 MB**（含三张高清场景、帧动画、音频与字体）。

## 工程结构

```
src/
  components/
    scene/        场景图/回退：窗户、雨、桌子、台灯
    timer/        计时显示、进度环、控制条、模式切换
    supervisor/   相框、探头帧播放、气泡、查岗、记过
    panels/       历史、成就、设置、引导、结算
    hud/          顶栏
  store/          settings / progress / session
  hooks/          timer engine、supervisor、ambience、hotkeys、reduced motion
  lib/            纯函数：计时状态机、巡查规则、进度/成就、统计、存储、音频
  data/           场景、成就、猫台词、等级
docs/
  HANDOFF.md       交接文档（先读）
  product.md       玩法、公式、状态机、存储
  scene-prompts.md Seedream 高清场景提示词
  video-prompts.md 耄耋探头/哈气视频提示词
  research/        两套竞品拆解与品类研究
  screenshots/     README 截图
public/
  scenes/         高清场景图（缺图自动回退 SVG）
  supervisor/     肖像、静态贴纸、帧动画 sprite sheet + manifest
  audio/          雨声循环、真实哈气声
  icons/          PWA 图标
scripts/          素材处理脚本（肖像/音频/图标、视频切帧抠像）
```

## 部署

仓库自带 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：push 到 `main` 后跑 `npm run verify`，然后检查 Pages 是否启用；启用则发布，未启用则跳过 deploy 并输出提示。

**当前已配置为 GitHub Actions，deploy 成功。** 新仓库 / 重建 Pages 时必须选择 GitHub Actions，不能选 “Deploy from a branch”：

1. 打开仓库 **Settings → Pages → Build and deployment**。
2. **Source** 选择 **GitHub Actions**（不是 `Deploy from a branch`）。
3. 保存后打开 **Actions → Deploy to GitHub Pages → Run workflow**，或再 push 一次。
4. 等 deploy 任务变绿，访问 `https://francisco939.github.io/LearningRoom/`。

目标地址：`https://francisco939.github.io/LearningRoom/`

**如果打开是空白页**（通常发生在刚切换 Source、或浏览器还缓存着旧 HTML）：

- 查看网页源码，若入口还是 `<script src="/src/main.tsx">`，说明 Pages 正在发布仓库根目录（branch 模式），不是构建产物。
- 在 **Settings → Pages** 确认 Source 是 **GitHub Actions**，重跑 `Deploy to GitHub Pages`。
- 构建产物的入口应该是 `/LearningRoom/assets/index-*.js`，不是 `/src/main.tsx`。
- 用无痕窗口打开，或 Ctrl+Shift+R 强制刷新；GitHub Pages 的 HTML 缓存约 10 分钟。

> Vite 在 CI 中会自动把 `base` 设为 `/LearningRoom/`；本地构建仍然是 `/`。

## 素材与许可

代码是 **MIT**；素材单独授权，**不要只引用 MIT**：

| 素材 | 来源 | 许可 |
| --- | --- | --- |
| 督学肖像 / 探头贴纸 | 项目作者提供（豆包 AI 生成） | 作者保留权利，仅用于本项目 |
| 三张高清场景 | 项目作者用 Seedream 生成 | 作者保留权利，仅用于本项目 |
| 雨声 | seth-m / Freesound 270349 | CC0 1.0 |
| 哈气声 | Zabuhailo / Wikimedia Commons | CC0 1.0 |
| 场景/猫脸 SVG、图标 | 本项目原创 | MIT |
| Fraunces / Manrope 字体 | Fontsource | SIL OFL 1.1 |

完整署名、处理方式与备用素材见 [ASSETS.md](ASSETS.md)。

> 「耄耋」是原创致敬角色，灵感来自中文互联网上「上了年纪、脾气不好、眯眼看人」的老橘猫形象。本项目**不使用**真实「圆头猫爹 / 圆头耄耋」的影像，也不包含与虐猫梗相关的内容。设置里可以上传自己的图替换督学形象（只保存在本机）。

## 已知限制

- **纯本地**：没有账号/云同步；清浏览器数据即全部丢失，目前也没有导出入口。
- **没有摄像头监督**：这是产品边界，不是缺失；只做「在场」判断。
- **督学形象只支持图片**：不在浏览器里做视频转帧/抠像；要换动画请按 `docs/video-prompts.md` 在构建期生成 sprite sheet。
- **移动端未做真机审计**：布局已做响应式，但还没在 390×844 / iPhone Safari 上逐项验收。
- **帧动画约 1 MB**：探头 83 帧 + 哈气 73 帧，低端机首次加载可能慢；失败会回退静态贴纸。
- **没有 E2E**：hooks、帧播放、PWA 目前靠手工清单，重构巡查逻辑时请补测试。

## 路线图

- [x] 启用 GitHub Pages（GitHub Actions 源，2026-11-08 部署成功）
- [ ] 线上手工验收：计时 / 巡查 / 刷新恢复 / 离线
- [ ] ErrorBoundary + 数据导出/导入
- [ ] Playwright E2E（计时 / 巡查 / 刷新恢复）
- [ ] 移动端与 Safari 实机适配
- [ ] 账号与云同步（`lib/repository.ts` 已留接缝）
- [ ] 多人「一起自习」房间（SSE / WebSocket）
- [ ] DAY Cycle / 自定义场景包 / 音频包
- [ ] Windows 桌面悬浮窗

## 文档

- [交接文档](docs/HANDOFF.md)：现状、架构、资产管线、坑、接力顺序
- [玩法与状态机](docs/product.md)
- [高清场景提示词](docs/scene-prompts.md)
- [探头/哈气视频提示词](docs/video-prompts.md)
- [素材与许可](ASSETS.md)
- 研究底稿：
  - [凛冬督学局（redwatch.top）](docs/research/01-redwatch.md)
  - [Stillwhere（stillwhere.app）](docs/research/02-stillwhere.md)
  - [在线自习室品类图谱](docs/research/03-landscape.md)
  - [LearningRoom 架构建议](docs/research/04-learningroom-proposal.md)
