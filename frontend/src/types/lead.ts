export interface LeadOption {
  id: string
  name: string
  color?: string | null
  semantic_type?: string
}

export interface LeadAssignee {
  id: string
  name: string
  email: string
}

export interface Lead {
  id: string
  first_name: string
  last_name: string | null
  full_name: string
  company_name: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  score: number | null
  estimated_value: number
  currency: string
  description: string | null
  source: LeadOption | null
  status: LeadOption | null
  assignee: LeadAssignee | null
  last_contacted_at: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadOptions {
  sources: LeadOption[]
  statuses: LeadOption[]
  assignees: LeadAssignee[]
}

export interface PaginatedLeads {
  data: Lead[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
