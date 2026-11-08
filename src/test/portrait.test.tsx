import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortraitFrame } from '@/components/supervisor/PortraitFrame'

describe('PortraitFrame: custom name', () => {
  it('显示用户起的名字', () => {
    const { container } = render(<PortraitFrame image={null} name="小橘" state="idle" />)
    expect(screen.getByText('小橘')).toBeInTheDocument()
    expect(container.querySelector('.portrait')).toHaveAttribute('aria-label', '小橘督学')
  })

  it('空名字回退到「耄耋」', () => {
    render(<PortraitFrame image={null} name="   " state="idle" />)
    expect(screen.getByText('耄耋')).toBeInTheDocument()
  })
})
