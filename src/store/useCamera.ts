import { create } from 'zustand'
import { acquireCamera, CameraUnavailableError } from '@/lib/cameraPresence'

export type CameraStatus = 'idle' | 'granted' | 'denied' | 'unsupported' | 'watching'

interface CameraStore {
  status: CameraStatus
  error: string | null
  active: boolean
  present: boolean
  setStatus: (status: CameraStatus, error?: string | null) => void
  setActive: (active: boolean) => void
  setPresent: (present: boolean) => void
  reset: () => void
}

export const useCamera = create<CameraStore>((set) => ({
  status: 'idle',
  error: null,
  active: false,
  present: false,
  setStatus: (status, error = null) => set({ status, error }),
  setActive: (active) => set({ active }),
  setPresent: (present) => set({ present }),
  reset: () => set({ status: 'idle', error: null, active: false, present: false }),
}))

// 用户主动开启摄像头时触发一次权限申请，把浏览器权限弹窗放到自然时机，
// 而不是在查岗时突然弹出。成功后立即停流，只在设置页用于确认状态。
export async function probePermission(): Promise<void> {
  const cam = useCamera.getState()
  cam.setStatus('watching')
  try {
    const result = await acquireCamera()
    result.stop()
    cam.setStatus('granted', null)
  } catch (err) {
    if (err instanceof CameraUnavailableError) {
      cam.setStatus(err.reason === 'denied' ? 'denied' : 'unsupported', err.message)
    } else {
      cam.setStatus('unsupported', '无法打开摄像头')
    }
  }
}
