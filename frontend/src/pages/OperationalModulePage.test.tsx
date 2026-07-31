import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import OperationalModulePage from './OperationalModulePage'

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

describe('OperationalModulePage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
  })

  it('shows an empty state and opens an accessible required form', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <OperationalModulePage module="companies" />
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('No customers yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('dialog', { name: 'Add company' })).toBeInTheDocument()
    expect(screen.getByLabelText('Company name *')).toBeRequired()
  })
})
