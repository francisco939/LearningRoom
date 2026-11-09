// 摄像头查岗：零依赖的「画面是否有人/在动」帧差检测。
// 所有帧都在本机内存中转瞬处理，不存储、不上传、不落盘。

export interface CameraAcquireResult {
  stream: MediaStream
  stop: () => void
}

export type CameraFailReason = 'denied' | 'not-found' | 'unsupported' | 'insecure'

export class CameraUnavailableError extends Error {
  reason: CameraFailReason
  constructor(reason: CameraFailReason, message: string) {
    super(message)
    this.name = 'CameraUnavailableError'
    this.reason = reason
  }
}

export const MOTION = {
  sampleIntervalMs: 300,
  frameWidth: 160,
  frameHeight: 120,
  threshold: 0.015,
  settleFrames: 4,
} as const

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
}

export async function acquireCamera(): Promise<CameraAcquireResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraUnavailableError('unsupported', '此浏览器不支持摄像头访问')
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new CameraUnavailableError('insecure', '摄像头需要在 HTTPS 或 localhost 下使用')
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
    return { stream, stop: () => stream.getTracks().forEach((t) => t.stop()) }
  } catch (err) {
    throw normalizeCameraError(err)
  }
}

function normalizeCameraError(err: unknown): CameraUnavailableError {
  const name = (err as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return new CameraUnavailableError('denied', '摄像头权限被拒绝，请在浏览器设置里允许访问')
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return new CameraUnavailableError('not-found', '找不到可用的摄像头')
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return new CameraUnavailableError('not-found', '摄像头被占用或不可用')
  }
  return new CameraUnavailableError('unsupported', '无法打开摄像头')
}

// 两张 RGBA 缓冲按亮度算平均绝对差，归一化到 [0, 1]。
export function meanAbsDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const n = Math.min(a.length, b.length)
  if (n < 4) return 0
  let sum = 0
  let count = 0
  for (let i = 0; i + 3 < n; i += 4) {
    const la = (a[i] * 299 + a[i + 1] * 587 + a[i + 2] * 114) / 1000
    const lb = (b[i] * 299 + b[i + 1] * 587 + b[i + 2] * 114) / 1000
    sum += Math.abs(la - lb)
    count += 1
  }
  return count === 0 ? 0 : sum / count / 255
}

export interface MotionGate {
  push(rgba: Uint8ClampedArray): boolean
  reset(): void
}

// 帧差门：喂入连续帧，返回「本帧是否检测到明显活动」。
// 前 settleFrames 帧用于让摄像头自动曝光/白平衡稳定，不判活动。
export function createMotionGate(options?: { threshold?: number; settleFrames?: number }): MotionGate {
  const threshold = options?.threshold ?? MOTION.threshold
  const settleFrames = options?.settleFrames ?? MOTION.settleFrames
  let previous: Uint8ClampedArray | null = null
  let frames = 0

  return {
    push(rgba) {
      frames += 1
      if (previous === null) {
        previous = rgba.slice()
        return false
      }
      if (frames <= settleFrames) {
        previous = rgba.slice()
        return false
      }
      const diff = meanAbsDiff(previous, rgba)
      previous = rgba.slice()
      return diff > threshold
    },
    reset() {
      previous = null
      frames = 0
    },
  }
}
