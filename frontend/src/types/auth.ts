export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  currency: string
  timezone: string
  locale: string
  date_format: string
  is_owner: boolean
}

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  status: string
  roles?: string[]
  last_login_at: string | null
}

export interface AuthPayload {
  user: User
  organizations: Organization[]
  current_organization?: string | null
}
