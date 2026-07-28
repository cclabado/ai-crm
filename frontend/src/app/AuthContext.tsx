import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setOrganizationHeader } from '../lib/api'
import type { AuthPayload, Organization, User } from '../types/auth'

interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

interface AuthContextValue {
  user: User | null
  organizations: Organization[]
  currentOrganization: Organization | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function selectOrganization(organizations: Organization[], requestedId?: string | null) {
  return organizations.find((organization) => organization.id === requestedId) ?? organizations[0] ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyAuthPayload = useCallback((payload: AuthPayload) => {
    const storedOrganizationId = localStorage.getItem('currentOrganization')
    const selected = selectOrganization(
      payload.organizations,
      payload.current_organization ?? storedOrganizationId,
    )

    setUser(payload.user)
    setOrganizations(payload.organizations)
    setCurrentOrganization(selected)
    setOrganizationHeader(selected?.id ?? null)

    if (selected) localStorage.setItem('currentOrganization', selected.id)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: AuthPayload }>('/api/v1/auth/me')
      applyAuthPayload(data.data)
    } catch {
      setUser(null)
      setOrganizations([])
      setCurrentOrganization(null)
      setOrganizationHeader(null)
    } finally {
      setIsLoading(false)
    }
  }, [applyAuthPayload])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session hydration is asynchronous.
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setOrganizations([])
      setCurrentOrganization(null)
      setOrganizationHeader(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await api.get('/sanctum/csrf-cookie')
      const { data } = await api.post<{ data: AuthPayload }>('/api/v1/auth/login', credentials)
      applyAuthPayload(data.data)
    },
    [applyAuthPayload],
  )

  const logout = useCallback(async () => {
    await api.post('/api/v1/auth/logout')
    localStorage.removeItem('currentOrganization')
    setOrganizationHeader(null)
    setUser(null)
    setOrganizations([])
    setCurrentOrganization(null)
  }, [])

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      await api.post('/api/v1/organizations/switch', { organization_id: organizationId })
      const selected = selectOrganization(organizations, organizationId)
      setCurrentOrganization(selected)
      setOrganizationHeader(selected?.id ?? null)
      localStorage.setItem('currentOrganization', organizationId)
    },
    [organizations],
  )

  const value = useMemo(
    () => ({
      user,
      organizations,
      currentOrganization,
      isLoading,
      login,
      logout,
      switchOrganization,
      refresh,
    }),
    [user, organizations, currentOrganization, isLoading, login, logout, switchOrganization, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- colocating the provider hook keeps the context private.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
