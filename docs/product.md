# 产品规则与实现说明

> 本文保留历史监督版规则。当前 `main` 与 `feat/stillwhere-study-room` 都是纯自习室：
> 不展示/不启用监督，主要功能见 [README](../README.md) 与 [server/README](../server/README.md)。

## 1. 核心循环

```
选场景 → 设节奏 → 开始专注
   ↑                  ↓
   └── 结算 ← 巡查/扣星 ← 计时结束
```

单页应用，无路由。主界面只有「场景 + 计时 + 一个主动作」，历史/成就/设置是覆盖面板。

## 2. 计时器状态机

状态：`idle → running ⇄ paused → finished`；阶段：`focus → break → focus ... → done`。

| 当前 | 事件 | 结果 | 副作用 |
| --- | --- | --- | --- |
| idle | START | running/focus | 设 `phaseEndsAt`、3 星、排巡查 |
| running | PAUSE | paused | 记录 `pausedAt`、取消巡查 |
| paused | RESUME | running | `phaseEndsAt` 顺延、累计暂停时长 |
| running | TICK 到点 | break / 下一轮 / finished | 累计专注、提示音、按设置自动开始 |
| running | SKIP | 下一阶段 | 结算已过的专注 |
| running | VIOLATION | running / finished | 扣星；归零即失败 |
| 任意 | ABORT | finished/aborted | 半速结算鱼干 |
| stopwatch | END | finished/completed | 按实际时长结算 |

关键实现：

- **时间戳驱动**：剩余时间 = `phaseEndsAt - now`，不做递减计数，后台节流/休眠不漂移。
- **每阶段独立锚点**：`focusStartedAt` + `focusPausedTotalMs`，跨 break 进入下一轮不会把休息算进专注。
- **刷新恢复**：运行中的 `TimerState` 写入 `lr.active.v1`；刷新后恢复，过点只补一次阶段。
- **秒表**：`phaseEndsAt = null`，按 `focusAccumMs + 当前段` 累计。

## 3. 耄耋监督

| 模式 | 巡查间隔 | 离开宽限 | 查岗时限 | 无操作触发查岗 |
| --- | --- | --- | --- | --- |
| 宽松 | 8–15 分钟 | 90 秒 | 20 秒 | 10 分钟 |
| 标准 | 4–8 分钟 | 45 秒 | 15 秒 | 5 分钟 |
| 严格 | 2–4 分钟 | 20 秒 | 10 秒 | 2 分钟 |

- **首轮巡查**：开始后 60–120 秒，让用户第一次就感知到猫的存在。
- **探头**：从当前场景的窗边/屏幕边缘出现；位置由 `lib/peek.ts` 按场景随机选择。
- **离座**：`visibilitychange` 记录隐藏时长，回来时超过宽限 → 扣 1 星。
- **查岗**：气泡出现，倒计时环走完未回应 → 扣 1 星。
- **哈气**：超时或离座时播放张嘴哈气动画 + 屏幕震动 + 记过印章，并播放真实猫哈气声。
- **帧动画**：`peek-sheet.webp` / `yell-sheet.webp` 是 15fps 预抠像 sprite sheet，`PeekVisual` 按 JSON 里的 fps/网格逐帧绘制；yell 最后一帧保持张嘴。帧缺失时回退到 `maodie-peek.webp` 贴纸。
- **音效**：`public/audio/hiss.m4a` 是 CC0 真实猫哈气声，在 yell 时播放；播放失败时用 Web Audio 合成噪声兜底。
- **无操作**：只提前触发查岗，不直接扣星（读书时可能没有键鼠输入）。
- **冷却**：同一类违规 30 秒内不重复扣星。
- **暂停/休息**：不巡查；页面隐藏时错过的巡查会在 5 秒后重试，不会永久丢失。
- **关闭监督**：`supervisionEnabled=false` 时停止巡查、离座判定和扣星，隐藏猫/气泡/记过/等级条；计时、场景、记录、成就照常。适合只想要自习室氛围的用户。

设计边界：不做摄像头、不做屏幕采集、不做人脸识别；只在浏览器可见性 API 与用户输入事件上做判断，并明确写在界面上。

## 4. 进度与成长

```
fishEarned =
  completed → floor(focusedSec / 600) + starsLeft
  aborted   → floor(focusedSec / 1200)
  failed    → 0
```

- **业务日**：`dayKey(ts)` 取 `ts - 4h` 的本地日期，即凌晨 04:00 切日。
- **连续天数**：仅 completed 场次；同日不重复 +1；断档重置为 1；`bestStreak` 保留最高。
- **场景收集**：只有 completed 场次写入 `scenesUsed`。
- **等级**：`totalFocusSec / 3600` 对照 `LEVELS` 的 0/5/20/50/100 小时。
- **成就 13 个**：首次完成、首个番茄、10 场、连续 3/7 天、三星、严格三星、夜猫子（00–04）、早起猫（05–08）、10 小时、50 小时、三个场景、100 条鱼干。

单场成就都会校验 `session.status === 'completed'`，避免中止场次误解锁。

## 5. 存储

localStorage：

| Key | 内容 |
| --- | --- |
| `lr.settings.v1` | 模式、时长、轮数、监督档位、`supervisionEnabled`、`catName`、场景、声音、音量、自定义猫图标记、动效偏好 |
| `lr.progress.v1` | 累计专注、场次、鱼干、连续天数、场景集合、成就解锁时间、是否看过引导 |
| `lr.sessions.v1` | 最近 1000 场记录 |
| `lr.active.v1` | 运行中计时快照（刷新恢复用） |

IndexedDB（`idb-keyval`）：

| Key | 内容 |
| --- | --- |
| `lr-cat-image` | 用户上传的督学形象（canvas 压到最长边 720px，JPEG dataURL） |

读取全部 try/catch；损坏则回退默认值。`lib/repository.ts` 定义 `Repository` 接口，未来接后端时替换实现即可。

## 6. 数据流

```
UI 事件 → useSessionStore → lib/timer.reduce（纯函数）
                              ↓ 阶段结束
                     buildDraftSession → lib/session.buildSession
                              ↓
                     useProgressStore.record → lib/progress.commitSession
                              ↓
                stats / achievements / streak / fish → localStorage
```

巡查：

```
visibilitychange / pointer / keydown / interval
        ↓
hooks/useSupervisor → useSession.setPatrol / violation
        ↓
PatrolPrompt / ViolationStamp / CatBubble
```

## 7. 成就与文案

- 猫台词按 `idle / patrol / approve / violation / fail / complete` 分池，随机且避免连续重复。
- 文案基调：简短、命令式、克制的幽默；不玩虐猫梗，不人身攻击。
- 结算文案区分「光荣下班 / 提前收工 / 被赶出」。

## 8. 已知取舍

- 没有账号与云同步：换设备不同步，清浏览器数据即丢失。
- 没有真实的「判定模型」：监督完全基于可见性与输入，属于轻约束，不保证防作弊。
- 场景默认是手绘 SVG；放入 `public/scenes/*.webp` 后自动切换为高清照片，缺图时回退。照片场景没有视频背景与 DAY Cycle。
- 秒表的鱼干按 25 分钟循环比例结算，不设上限。
- 时间以本地时钟为准，不做服务端权威校验（单机场景）。
