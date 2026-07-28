import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('renders an accessible button and handles activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Create lead</Button>)
    await user.click(screen.getByRole('button', { name: 'Create lead' }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
