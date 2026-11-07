# 技术证据附录

> 记录可直接复核的观测结果，便于后续验证或复盘。采集时间 2026-11-07，使用公开页面与公开 API，未登录、未绕过任何访问控制。

## 1. 站点与托管

### redwatch.top

```
HTTP/1.1 200
Server: tencent-cos
Content-Type: text/html; charset=utf-8
ETag: "93e805d60b58558f76dcfbb1ee1c7739"
X-Cache-Lookup: Cache Miss
X-NWS-LOG-UUID: 14932087459627007865
x-cos-request-id: NmFlZjQzYTVfYjkyZmU3MDlfOWQxMF8xZTI2MTIhNA==
Cache-Control: must-revalidate, no-cache, no-store
Access-Control-Allow-Origin: *
Content-Length: 29480
```

- 首页 HTML 29 KB，加载 24 个 `/_next/static/chunks/*.js`，合计约 2.67 MB（未压缩传输）。
- 10 个 CSS 文件，`/_next/static/css/*.css`。
- `robots.txt` 暴露隐藏路由：`/app/`、`/calibrate/`、`/donate/`、`/settings/`、`/stats/`、`/supply/`。
- `sitemap.xml` 公开路由：`/`、`/about/`、`/guide/`、`/faq/`、`/privacy-camera/`、`/preview/`、`/privacy/`、`/terms/`。

### stillwhere.app

```
HTTP/1.1 200
Server: cloudflare
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
Server-Timing: cfEdge;dur=29,cfOrigin;dur=126
CF-RAY: a56d643afe1cfba8-AMS
```

- 首页 HTML 27 KB，24 个 chunk，合计约 1.31 MB。
- `cfOrigin` 存在 → 源站渲染，不是纯 Cloudflare Workers。
- PWA manifest：`display: standalone`、`theme_color: #101617`。

## 2. redwatch API

### 2.1 `/health`

```json
{
  "status": "ok",
  "businessDayPolicy": {
    "version": 1,
    "timezone": "Asia/Shanghai",
    "startTime": "04:00",
    "cutoverDate": "2026-08-23"
  },
  "capabilities": {
    "paymentCreateV2": true,
    "inviteMilestonesV1": true,
    "patrolTasks": true,
    "appRestrictionV1": false,
    "nativeAndroidSessionV1": true,
    "patrolCosUploads": true,
    "archiveCosUploads": false,
    "supplyDecorationCatalogVersion": 1,
    "supplyDecorationCatalogItems": 309,
    "decorLayout": {
      "version": 3,
      "supervisorScoped": true,
      "itemMax": 256,
      "jsonMaxLength": 65536,
      "scaleMin": 0.1,
      "scaleMax": 8,
      "coordinateMin": -100,
      "coordinateMax": 200
    },
    "supervisorEntitlementsV1": true
  }
}
```

### 2.2 `/auth/capabilities`

```json
{
  "altcha": true,
  "phoneAuth": true,
  "phoneRegistration": true,
  "passwordLogin": { "email": true, "phone": true },
  "registration": { "email": true, "phone": true },
  "passwordReset": { "email": true, "phone": true },
  "binding": { "email": true, "phone": true }
}
```

响应头：`Server: nginx/1.26.3`、`x-ratelimit-limit: 60`、`x-ratelimit-remaining`、`x-ratelimit-reset`、`EO-LOG-UUID`、`EO-Cache-Status: MISS`、NEL 上报 `teo-rum.com`。

### 2.3 前端提取的 API 路径

```text
/auth/login  /auth/refresh  /auth/logout
/auth/send-code  /auth/verify-code  /auth/human-challenge  /auth/capabilities
/auth/phone/register  /auth/phone/verify-registration  /auth/phone/reset-password
/auth/phone/bind/send-code  /auth/phone/bind/confirm
/auth/email/bind/send-code  /auth/email/bind/confirm
/auth/delete-account/send-code  /auth/delete-account/confirm

/sync/session-progress  /sync/session-record  /sync/session-handoff/complete
/sync/stats  /sync/catch  /sync/catch/{id}

/patrol/tasks  /patrol/evaluate  /patrol/confirm  /patrol/calibrate
/patrol/unchanged-timeout  /patrol/image-upload-ticket
/patrol-archive/preference  /patrol-archive/frame
/archive/image-upload-ticket

/social/friends/{id}  /social/preferences
/study/rooms/{id}  /study/preferences

/supply  /supply/supervisors/{id}  /supply/messages/{id}
/supply/decor-content/{id}  /supply/labor-reward-policy
/decor-presets/{id}

/donate/pay/create  /donate/offer/roll  /donate/offer/activate  /donate/offer/status

/announcements  /announcement/seen  /content/faqs
/track/visit  /track/ping  /track/error  /track/product-event  /track/settings

/me  /me/preferences  /me/avatar  /me/locale  /me/features  /me/notification-preferences
```

### 2.4 巡查图片上传链路（bundle 还原）

```js
// 伪代码
const jpeg = normalizeToJpeg(imageDataUrl);       // 校验 FFD8 ... FFD9，1KB < size < limit
const grant = await requestGrant();               // 404 → commitLegacy()
if (grant.alreadyAccepted) return grant.result;    // 幂等
const form = new FormData();
Object.entries(grant.formFields).forEach(([k, v]) => form.append(k, v));
form.append("file", jpeg, "archive.jpg");
await fetch(grant.uploadUrl, {
  method: "POST", body: form, credentials: "omit",
  redirect: "error", referrerPolicy: "no-referrer", signal,
});
await commitTicket(grant.imageTicket);             // 服务端落库
```

可重试分类：`403 / 408 / 409 / 425 / 429 / >=500`。

## 3. stillwhere API 与媒体

### 3.1 `/api/account/status`

```json
{
  "configured": true,
  "turnstile": {
    "required": true,
    "siteKey": "0x4AAAAAAFFHDDSOfC4xWFD2"
  }
}
```

### 3.2 前端提取的 API 路径

```text
/api/account/status  /api/account/access  /api/account/export
/api/auth/*（better-auth）
/api/sync  /api/sync?...
/api/achievements  /api/achievements/notices  /api/achievements/population
/api/community/events（SSE）  /api/community/messages  /api/community/messages/{id}
/api/community/presence  /api/community/participants  /api/community/profile
/api/community/reports  /api/community/mentions  /api/community/translations
/api/announcements  /api/announcements/impressions  /api/notifications
/api/management/inbox
/api/analytics/event  /api/media-performance
```

`/api/achievements` 未登录返回 `401 {"code":"AUTH_REQUIRED"}`。

### 3.3 音频 manifest（节选）

```json
{
  "version": 1,
  "generatedAt": "2026-10-31T08:07:49.899Z",
  "tracks": [
    {
      "id": "freesound:3c11608584b3d023ac8f",
      "name": "Atlantic Shore Waves",
      "sourceUrl": "/media/audio/freesound/level-matched/freesound-...wav",
      "mimeType": "audio/wav",
      "durationSeconds": 66.742494,
      "source": "freesound",
      "libraryType": "environment",
      "author": "Sacha.Julien",
      "sourcePage": "https://freesound.org/people/Sacha.Julien/sounds/724582/",
      "license": "CC0-1.0",
      "format": "pcm_s24le",
      "size": 17660166,
      "checksum": "ba510d...",
      "loudness": {
        "version": 1,
        "referenceLUFS": -16.7,
        "integratedLUFS": -16.74,
        "truePeakDBTP": -1.46,
        "headroomLimited": false
      }
    }
  ]
}
```

### 3.4 其他观测

- `/api/community/presence` 对 GET 返回 `405`，说明只接受 POST/SSE 订阅。
- `/media/audio/manifest.json`：62 KB，`Cache-Control: no-cache`，`last-modified: 2026-10-31`。
- 场景图标注 `图片 · 1672×941`、来源 `Stillwhere AI`。
- 站点 sitemap 有 en / zh-Hans / zh-Hant / ja 四套 hreflang。
- 页面 DOM 使用 Radix（`radix-*` id、`data-slot`）+ Tailwind 原子类。

## 4. 前端库指纹

| 指纹 | redwatch | stillwhere |
| --- | --- | --- |
| Next.js App Router | ✅ | ✅ |
| React Server Components payload | ✅ | ✅ |
| Zustand | ✅（persist） | ✅（persist） |
| IndexedDB | ✅ | ✅ |
| better-auth | ❌ | ✅ |
| Cloudflare Turnstile | ❌ | ✅ |
| ALTCHA | ✅ | ❌ |
| SSE / EventSource | ❌ | ✅ |
| Capacitor | ✅ | ❌ |
| Tailwind | ❌（手写 CSS） | ✅ |
| Radix / shadcn | ❌ | ✅ |
| WebRTC / LiveKit / Agora | ❌ | ❌ |
| Stripe / 支付 SDK | 自建 `/donate/pay/create` | ❌ |

## 5. 未确认项（不要当成事实）

- 两站的具体数据库类型、缓存组件、消息队列。
- redwatch 的视觉判定供应商、支付渠道。
- stillwhere 的源站托管商、数据库类型。
- 两站的真实 DAU/留存；仅 Stillwhere 公告提到「69 人、D7 有效访客 283」。
