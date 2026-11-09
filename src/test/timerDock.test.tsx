import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TimerDock } from '@/components/timer/TimerDock'
import { useSettings } from '@/store/useSettings'
import { useSession } from '@/store/useSession'

function renderDock() {
  render(<TimerDock remaining={1500} ratio={1} compact onOpenSettings={() => {}} />)
}

describe('TimerDock 请假入口', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState().reset()
    useSession.getState().resetSession()
  })

  afterEach(() => {
    cleanup()
    useSettings.getState().reset()
    useSession.getState().resetSession()
  })

  it('监督关闭时不显示请假入口', () => {
    renderDock()
    expect(screen.queryByRole('button', { name: '我去一下' })).not.toBeInTheDocument()
  })

  it('监督开启后可请假并切换状态', () => {
    useSettings.getState().update({ supervisionEnabled: true })
    useSession.getState().start(useSettings.getState().settings)
    renderDock()

    act(() => {
      screen.getByRole('button', { name: '我去一下' }).click()
    })
    expect(screen.getByRole('button', { name: '回来了' })).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: '回来了' }).click()
    })
    expect(screen.getByRole('button', { name: '我去一下' })).toBeInTheDocument()
  })
})
