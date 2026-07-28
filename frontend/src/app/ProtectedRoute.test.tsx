import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from './AuthContext'

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }))

describe('ProtectedRoute', () => {
  it('redirects anonymous visitors to login and preserves the requested location', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as ReturnType<typeof useAuth>)
    render(
      <MemoryRouter initialEntries={['/leads']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/leads" element={<p>Leads</p>} />
          </Route>
          <Route path="/login" element={<p>Sign in</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Leads')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' }, isLoading: false } as ReturnType<
      typeof useAuth
    >)
    render(
      <MemoryRouter initialEntries={['/leads']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/leads" element={<p>Leads</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })
})
