import { render } from '@testing-library/react'
import { Panel } from '@/components/panels/Panel'

describe('Panel', () => {
  it('父组件重渲染时不会把焦点从输入框抢走', () => {
    const { rerender } = render(
      <Panel open title="设置" onClose={() => {}}>
        <input aria-label="专注（分）" defaultValue="25" />
      </Panel>,
    )

    const input = document.querySelector('input') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)

    // 每次渲染都传一个新 onClose，模拟 App 的写法。
    rerender(
      <Panel open title="设置" onClose={() => {}}>
        <input aria-label="专注（分）" defaultValue="25" />
      </Panel>,
    )

    expect(document.activeElement).toBe(input)
  })
})
