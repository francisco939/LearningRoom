import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TimerHint } from '@/components/timer/TimerHint'

describe('TimerHint', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('10 秒后自动关闭', () => {
    vi.useFakeTimers()
    render(<TimerHint onOpenSettings={() => {}} />)

    expect(screen.getByRole('button', { name: '打开设置修改时长' })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.queryByRole('button', { name: '打开设置修改时长' })).not.toBeInTheDocument()
  })

  it('点击后立即关闭并打开设置', () => {
    vi.useFakeTimers()
    const onOpenSettings = vi.fn()
    render(<TimerHint onOpenSettings={onOpenSettings} />)

    act(() => {
      screen.getByRole('button', { name: '打开设置修改时长' }).click()
    })
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: '打开设置修改时长' })).not.toBeInTheDocument()
  })
})
