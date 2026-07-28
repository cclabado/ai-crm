import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import CalendarPage from './CalendarPage'

vi.mock('../lib/api', () => ({ api: { get: vi.fn() } }))

describe('CalendarPage', () => {
  it('renders tasks returned by the calendar API', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            public_id: 'task-1',
            title: 'Customer follow-up',
            type: 'follow_up',
            priority: 'high',
            status: 'todo',
            due_at: new Date().toISOString(),
          },
        ],
      },
    })
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Customer follow-up')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument()
  })
})
