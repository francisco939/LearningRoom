import { useState } from 'react'
import { Download, LogOut, MailCheck, RefreshCw, Trash2, User } from 'lucide-react'
import { Panel } from './Panel'
import { useAuth } from '@/store/useAuth'
import { useProgress } from '@/store/useProgress'
import { useSettings } from '@/store/useSettings'
import type { useSync } from '@/hooks/useSync'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'

interface AccountPanelProps {
  open: boolean
  onClose: () => void
  resetToken?: string | null
  sync: ReturnType<typeof useSync>
}

type Mode = 'login' | 'register' | 'forgot' | 'reset'

export function AccountPanel({ open, onClose, resetToken, sync }: AccountPanelProps) {
  const user = useAuth((s) => s.user)
  const status = useAuth((s) => s.status)
  const error = useAuth((s) => s.error)
  const clearError = useAuth((s) => s.clearError)
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)
  const logout = useAuth((s) => s.logout)
  const updateProfile = useAuth((s) => s.updateProfile)
  const resend = useAuth((s) => s.resendVerification)
  const forgot = useAuth((s) => s.forgotPassword)
  const reset = useAuth((s) => s.resetPassword)
  const changePassword = useAuth((s) => s.changePassword)
  const removeAccount = useAuth((s) => s.removeAccount)

  const [mode, setMode] = useState<Mode>(() => (resetToken ? 'reset' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameDraft, setNameDraft] = useState(user?.displayName ?? '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true)
    setNotice(null)
    clearError()
    try {
      await fn()
      if (success) setNotice(success)
    } catch {
      /* store 已记录错误 */
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <Panel open={open} onClose={onClose} title="账户" subtitle="登录后可在不同设备继续">
        <div className="flex items-center gap-3 rounded-xl border border-paper/10 bg-black/20 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-amber/15 text-amber">
            <User size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] text-paper/90">{user.displayName}</div>
            <div className="truncate text-[12px] text-paper/40">{user.email}</div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
              user.emailVerified
                ? 'border-emerald-400/30 text-emerald-300/80'
                : 'border-amber/30 text-amber/80',
            )}
          >
            {user.emailVerified ? '已验证' : '待验证'}
          </span>
        </div>

        {!user.emailVerified && (
          <div className="rounded-xl border border-amber/25 bg-amber/[0.06] p-3.5">
            <p className="text-[12px] leading-relaxed text-paper/60">
              验证邮箱后才能同步到云端。验证链接已经发到 {user.email}。
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => resend(user.email), '验证邮件已重新发送')}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-amber/90 disabled:opacity-50"
            >
              <MailCheck size={13} /> 重发验证邮件
            </button>
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-[12px] tracking-[0.2em] text-paper/45">资料</h3>
          <label className="block text-[12px] text-paper/40">
            显示名
            <input
              value={nameDraft}
              maxLength={20}
              onChange={(event) => setNameDraft(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
          <button
            type="button"
            disabled={busy || nameDraft.trim() === user.displayName}
            onClick={() => void run(() => updateProfile(nameDraft.trim()), '显示名已更新')}
            className="rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/65 transition hover:bg-paper/10 disabled:opacity-40"
          >
            保存显示名
          </button>
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] tracking-[0.2em] text-paper/45">同步</h3>
          <div className="flex items-center justify-between rounded-xl border border-paper/10 bg-black/20 px-3.5 py-3 text-[12px] text-paper/50">
            <span>
              {sync.syncing
                ? '正在同步…'
                : sync.lastSynced
                  ? `上次同步 ${new Date(sync.lastSynced).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                  : '尚未同步'}
            </span>
            <button
              type="button"
              disabled={sync.syncing}
              onClick={() => void sync.syncNow()}
              className="inline-flex items-center gap-1.5 text-amber/85 disabled:opacity-50"
            >
              <RefreshCw size={13} /> 立即同步
            </button>
          </div>
          {sync.error && <p className="text-[12px] text-danger">{sync.error}</p>}
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] tracking-[0.2em] text-paper/45">安全</h3>
          <label className="block text-[12px] text-paper/40">
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
          <label className="block text-[12px] text-paper/40">
            新密码（至少 8 位）
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
          <button
            type="button"
            disabled={busy || !currentPassword || newPassword.length < 8}
            onClick={() =>
              void run(async () => {
                await changePassword(currentPassword, newPassword)
                setCurrentPassword('')
                setNewPassword('')
              }, '密码已更新')
            }
            className="rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/65 transition hover:bg-paper/10 disabled:opacity-40"
          >
            修改密码
          </button>
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] tracking-[0.2em] text-paper/45">数据</h3>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const data = await api.exportMe()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = 'learningroom-export.json'
                anchor.click()
                URL.revokeObjectURL(url)
              }, '导出已开始')
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/65 transition hover:bg-paper/10"
          >
            <Download size={13} /> 导出我的数据
          </button>
        </section>

        <section className="space-y-2 border-t border-paper/10 pt-4">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/65 transition hover:bg-paper/10"
          >
            <LogOut size={13} /> 退出登录
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-2 text-[12px] text-danger/80 transition hover:text-danger"
            >
              删除账户
            </button>
          ) : (
            <div className="rounded-xl border border-danger/25 bg-danger/[0.04] p-3">
              <p className="text-[12px] text-paper/55">删除后账号、云端设置和记录都会消失，无法恢复。</p>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="输入密码确认"
                className="mt-2 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[13px] text-paper/85 outline-none focus:border-danger/45"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy || !deletePassword}
                  onClick={() =>
                    void run(async () => {
                      await removeAccount(deletePassword)
                      useProgress.getState().reset()
                      useSettings.getState().reset()
                      setConfirmDelete(false)
                      setDeletePassword('')
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1.5 text-[12px] text-danger disabled:opacity-40"
                >
                  <Trash2 size={13} /> 确认删除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-3 py-1.5 text-[12px] text-paper/45"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </section>

        {notice && <p className="text-[12px] text-emerald-300/80">{notice}</p>}
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </Panel>
    )
  }

  return (
    <Panel open={open} onClose={onClose} title="账户" subtitle="不登录也能自习；登录后可跨设备同步">
      {(mode === 'login' || mode === 'register') && (
        <div className="flex gap-2">
          {(['login', 'register'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item)
                clearError()
                setNotice(null)
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-[13px] transition',
                mode === item ? 'bg-paper text-ink' : 'text-paper/50 hover:text-paper',
              )}
            >
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>
      )}

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run(async () => {
            if (mode === 'login') await login(email, password)
            else if (mode === 'register') await register(email, password, displayName)
            else if (mode === 'forgot') await forgot(email)
            else if (mode === 'reset' && resetToken) await reset(resetToken, password)
          }, mode === 'forgot'
            ? '如果邮箱存在，重置链接已发送'
            : mode === 'register'
              ? '验证邮件已发送，打开链接后就可以登录'
              : undefined)
        }}
      >
        {mode === 'register' && (
          <label className="block text-[12px] text-paper/40">
            昵称
            <input
              value={displayName}
              maxLength={20}
              required
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
        )}
        {mode !== 'reset' && (
          <label className="block text-[12px] text-paper/40">
            邮箱
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
        )}
        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <label className="block text-[12px] text-paper/40">
            {mode === 'reset' ? '新密码' : '密码'}
            <input
              type="password"
              value={password}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-paper/10 bg-black/25 px-3 py-2 text-[14px] text-paper/85 outline-none focus:border-amber/45"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={busy || status === 'loading'}
          className="w-full rounded-full bg-gradient-to-b from-amber to-amber-deep px-5 py-2.5 text-[13px] font-medium text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {busy
            ? '处理中…'
            : mode === 'login'
              ? '登录'
              : mode === 'register'
                ? '注册并发送验证邮件'
                : mode === 'forgot'
                  ? '发送重置链接'
                  : '重设密码'}
        </button>
        {mode === 'login' && email && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => resend(email), '如果账号未验证，验证邮件已重发')}
            className="w-full text-center text-[11px] text-paper/35 transition hover:text-paper/60"
          >
            没收到验证邮件？
          </button>
        )}
      </form>

      <div className="flex items-center justify-between text-[12px]">
        {mode !== 'forgot' ? (
          <button
            type="button"
            onClick={() => {
              setMode('forgot')
              clearError()
              setNotice(null)
            }}
            className="text-paper/40 transition hover:text-paper/70"
          >
            忘记密码？
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode('login')
              clearError()
              setNotice(null)
            }}
            className="text-paper/40 transition hover:text-paper/70"
          >
            返回登录
          </button>
        )}
        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => {
              setMode('login')
              clearError()
            }}
            className="text-paper/40 transition hover:text-paper/70"
          >
            返回登录
          </button>
        )}
      </div>

      {notice && <p className="text-[12px] text-emerald-300/80">{notice}</p>}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </Panel>
  )
}
