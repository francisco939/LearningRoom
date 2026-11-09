import { create } from 'zustand'
import { api, ApiError, type AuthUser } from '@/lib/api'

type AuthStatus = 'guest' | 'loading' | 'authenticated'

interface AuthStore {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (displayName: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  removeAccount: (password: string) => Promise<void>
  clearError: () => void
}

function message(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'EMAIL_NOT_VERIFIED') return '请先打开邮箱里的验证链接，再登录'
    if (err.code === 'INVALID_CREDENTIALS') return '邮箱或密码不对'
    if (err.code === 'EMAIL_IN_USE') return '这个邮箱已经注册过了'
    if (err.status === 429) return '操作太频繁，稍后再试'
    if (err.status === 401) return '登录已过期，请重新登录'
    return err.message
  }
  if (err instanceof TypeError) return '网络不可用，检查连接后再试'
  return err instanceof Error ? err.message : '操作失败'
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  status: 'guest',
  error: null,

  refresh: async () => {
    set({ status: 'loading' })
    try {
      const { user } = await api.me()
      set({ user, status: 'authenticated', error: null })
    } catch {
      // 启动探测失败（离线/API 未部署）不打扰用户；真正操作时再报错。
      set({ user: null, status: 'guest', error: null })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const { user } = await api.login({ email, password })
      set({ user, status: 'authenticated' })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  register: async (email, password, displayName) => {
    set({ error: null })
    try {
      await api.register({ email, password, displayName })
      set({ user: null, status: 'guest' })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  logout: async () => {
    try {
      await api.logout()
    } catch {
      /* 即使网络失败也清本地状态 */
    }
    set({ user: null, status: 'guest', error: null })
  },

  updateProfile: async (displayName) => {
    set({ error: null })
    try {
      const { user } = await api.updateMe({ displayName })
      set({ user })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  verifyEmail: async (token) => {
    set({ error: null })
    try {
      const { user } = await api.verifyEmail(token)
      set({ user, status: 'authenticated' })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  resendVerification: async (email) => {
    set({ error: null })
    try {
      await api.resendVerification(email)
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  forgotPassword: async (email) => {
    set({ error: null })
    try {
      await api.forgotPassword(email)
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  resetPassword: async (token, password) => {
    set({ error: null })
    try {
      await api.resetPassword({ token, password })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ error: null })
    try {
      await api.changePassword({ currentPassword, newPassword })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  removeAccount: async (password) => {
    set({ error: null })
    try {
      await api.deleteMe({ password })
      set({ user: null, status: 'guest' })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))

export function authDisplayName(user: AuthUser | null): string {
  return user?.displayName || user?.email.split('@')[0] || '登录'
}

export function isLoggedIn(): boolean {
  return getAuthUser() !== null
}

function getAuthUser(): AuthUser | null {
  return useAuth.getState().user
}
