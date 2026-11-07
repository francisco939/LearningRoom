# 在线自习室产品研究 · LearningRoom

> 2026-11-07 第一轮调研。对象：**凛冬督学局（redwatch.top）**、**Stillwhere（stillwhere.app）**，并横向对比 CoStudy、番茄ToDo、Focusmate、StudyStream、YouTube Study Space 与若干开源项目。
> 方法：公开页面抓取、前端 bundle 静态分析、公开 API 探测、实际浏览器走查（含截图）。所有结论区分「实测」与「推断」，原始证据见 [`evidence.md`](evidence.md)。

## 一句话结论

| 产品 | 一句话 |
| --- | --- |
| 凛冬督学局 | 用「随机巡查 + 3 颗红星 + 8 小时地牢」把番茄钟做成一场**有惩罚的劳动**，游戏化和角色经济是护城河。 |
| Stillwhere | 用「场景 + 声音 + 四时变化」把 Study With Me 做成一个**可自定义的安静空间**，靠氛围和低压力留人。 |
| 两者共同点 | 都不是「计时器」，而是**用环境/规则改变你坐下来的那一刻**；技术上都选择了 Next.js，但一个静态化 + 独立 API，一个服务端渲染 + SSE。 |

## 核心发现

### 1. 品类分三种范式，别混着做

- **氛围型**（Stillwhere / LifeAt / qiye）：解决「开始难」。技术重点是媒体管线、首屏、内容供给。
- **监督型**（Redwatch / CoStudy / 番茄ToDo）：解决「坚持难」。技术重点是巡查/锁机、判定、惩罚与合规。
- **匹配型**（Focusmate / StudyStream / YouTube Study Space）：解决「一个人学不下去」。技术重点是实时音视频、预约匹配、审核。

范式决定了成本结构：氛围型可以静态托管 + 对象存储，月成本几十到几百；监督型要视觉推理和合规；匹配型要 WebRTC 和审核团队。

### 2. Redwatch 的工程亮点是「单帧巡查链路」

不是「开摄像头一直传」，而是：

```
端侧压帧 → 本地亮度指纹预筛 → 服务端发票据 → 前端直传 COS → 提交 ticket → 服务端判定
```

配套的是：单帧、不上传连续视频、指纹不出端、留档可关、可清空。这套设计同时解决了**带宽成本、隐私叙事、上传可靠性**三个问题，是它最值得抄的部分。

### 3. Stillwhere 的工程亮点是「内容流水线」

- 音频来自 Freesound CC0，构建期统一转 WAV、做**响度归一化**（约 -16.7 LUFS）、生成 level-matched 版本、记录许可证与校验和。
- 场景图统一 1672×941，按日期归档，标注 AI 生成。
- 运行时用 manifest 驱动，支持「提前准备 2 秒」预加载、交叉淡入、视频/图片/轮播三种模式。
- 场景有 DAY Cycle（早/午/下午/黄金/蓝调/夜），按本地时间切换。

这说明：**氛围型产品的竞争力在内容工程，不在前端特效。**

### 4. 实时能力可以很轻

Stillwhere 的「7 人正在专注」、讨论区、公告，全部用 **SSE**（`EventSource("/api/community/events")`），没有 WebSocket、没有 WebRTC。对「谁在、说句话」这种需求，SSE + Redis 足够，且部署简单、过代理稳。

Redwatch 的小队/战友更重，但从 bundle 看仍是 REST + 心跳为主，没有引入第三方实时云。

### 5. 两套完全不同的部署哲学

| | Redwatch | Stillwhere |
| --- | --- | --- |
| 前端 | Next.js **静态导出** | Next.js **服务端渲染**（RSC） |
| 托管 | 腾讯云 COS + CDN | Cloudflare + Node 源站 |
| API | 独立域名 `api.redwatch.top`（nginx + EdgeOne） | 同源 Route Handlers |
| 实时 | REST + 心跳 | SSE |
| 适合 | 多端（Web/Win/Android）、重客户端 | 单 Web、重 SEO/社区/管理 |
| 代价 | CORS、鉴权跨域、环境变量构建期注入 | 长连接占实例、源站带宽 |

**没有优劣，只有匹配。** 如果要做多端 + 重客户端能力（摄像头、屏幕共享、悬浮窗），静态站 + 独立 API 更灵活；如果以 Web 为主、要 SEO 和管理后台，Next 服务端更省事。

## 功能矩阵（精简）

| 维度 | Redwatch | Stillwhere | CoStudy | Focusmate | YouTube Study Space |
| --- | --- | --- | --- | --- | --- |
| 场景 | 苏维埃房间 + 督学官 | 场景库 + DAY Cycle | 虚拟校园/教室 | 视频 | 直播画面 |
| 监督 | 摄像头/屏幕巡查 + 惩罚 | 无 | 深度模式收座 | 有人在等 | 公开承诺 |
| 陪伴 | 小队 2–4 人 | 单空间人数 + 讨论 | 同桌/Co伴/语音 | 1:1 | 直播聊天 |
| 成长 | 8 级荣誉 + 军功币 | 39 成就 + 统计 | Co 币 + 连续天数 | 弱 | 排名/会员 |
| 商业化 | 道具/体验位/Premium | 免费 | 道具/会员 | 订阅 | 会员席 |
| 上手 | 登录 + 授权 | 游客即用 | 注册 + 选楼 | 预约 | 发一条命令 |

## 给 LearningRoom 的建议（详细版见 `04-learningroom-proposal.md`）

1. **先做氛围型单人体验**：全屏场景 + 三种计时 + 声音 + 本地历史。单人可用，才敢做社交。
2. **时间服务端权威**：`startedAt + planned` 由服务端下发，客户端只展示；提交幂等，心跳可合并。
3. **SSE 起步**：人数/状态/轻消息；视频/语音等到有明确需求再上 LiveKit。
4. **内容与代码分离**：场景/音频用 manifest + 构建期处理（sharp/ffmpeg + 响度归一化）。
5. **游客优先**：IndexedDB 本地记录，登录后合并，可导出。
6. **业务日 04:00 切**，统一时区，别用 00:00。
7. **摄像头巡查暂不做**：合规成本高，先用连续天数、公开承诺、小队互看等轻约束替代。
8. **主界面只留一个主动作**：场景 + 计时 + 播放，其余收进抽屉。

## 文档索引

| 文件 | 内容 |
| --- | --- |
| [`01-redwatch.md`](01-redwatch.md) | 凛冬督学局：定位、功能全图、技术栈、架构还原、API 版图、数据模型、工程实现、商业化、风险 |
| [`02-stillwhere.md`](02-stillwhere.md) | Stillwhere：定位、功能全图、技术栈、架构还原、数据模型、内容管线、设计分析、风险 |
| [`03-landscape.md`](03-landscape.md) | 品类图谱：三类范式、CoStudy/番茄ToDo/Focusmate/StudyStream/开源项目、对比矩阵、反模式 |
| [`04-learningroom-proposal.md`](04-learningroom-proposal.md) | 如果要做 LearningRoom：范式选择、推荐技术栈、参考架构、数据模型、计时状态机、presence、路线图、成本 |
| [`evidence.md`](evidence.md) | 技术证据：响应头、API、manifest、bundle 指纹、未确认项 |

截图在 [`assets/`](assets/)：

| 截图 | 说明 |
| --- | --- |
| `redwatch_home.png` | 督学官选择与苏维埃美学 |
| `redwatch_app.png` | 登录墙（手机/邮箱 + 密码） |
| `stillwhere_home.png` | 四语言选择 |
| `stillwhere_room2.png` | 主场景（Rainy Highrise） |
| `stillwhere_focus_menu.png` | 场景管理 / AI 背景库 / 播放模式 |
| `stillwhere_discuss.png` | 讨论区与在线人数 |
| `stillwhere_sessions.png` | 专注记录 |
| `stillwhere_ach.png` | 39 个成就 |
| `stillwhere_dialog.png` | 版本公告（独立开发者自述） |

## 调研方法说明

- **页面与接口**：Python `urllib` 抓取（PowerShell 的 Schannel 在当前环境不可用），保留原始 HTML/JSON。
- **前端分析**：下载首屏全部 JS chunk（Redwatch 2.67 MB / Stillwhere 1.31 MB），扫描库指纹、API 路径、平台判断、上传链路。
- **走查**：Playwright 驱动 Chromium，记录首屏、专注面板、讨论区、历史、成就、公告。
- **边界**：未注册账号、未绕过登录、未访问任何非公开数据；所有 API 探测均为匿名 GET。
- **推断标注**：数据库、缓存、视觉供应商、支付渠道等未在客户端暴露的，均标为「推断」，见 `evidence.md` 第 5 节。

## 待确认

这轮只做了「学习」，还没定方向。下一步需要你拍板：

1. **做哪种范式？** 氛围型（Stillwhere 路线）/ 监督型（Redwatch 路线）/ 混合型。
2. **面向哪个市场？** 国内（备案 + 手机号 + COS）还是海外（Stripe + R2 + OAuth）。
3. **单人还是团队？** 决定用托管服务还是自建。
4. **首版范围？** 只要单人计时 + 场景，还是一开始就带在线人数/讨论区。
5. **是否要移动端？** PWA 起步，还是直接 React Native/Flutter。

确定后我可以直接出 P0 的页面结构、数据模型和可运行原型。
