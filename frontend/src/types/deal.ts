export interface DealReference {
  id: string
  name: string
}

export interface Deal {
  id: string
  name: string
  value: number
  currency: string
  probability: number
  status: 'open' | 'won' | 'lost'
  expected_close_date: string | null
  actual_close_date: string | null
  description: string | null
  loss_reason: string | null
  pipeline: DealReference
  stage: DealReference & { color: string | null; semantic_type: string }
  company: DealReference | null
  contact: DealReference | null
  assignee: DealReference | null
}

export interface PipelineStage {
  id: string
  name: string
  color: string | null
  probability: number
  semantic_type: string
  position: number
  deal_count: number
  total_value: number
  deals: Deal[]
}

export interface DealPipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

export interface DealOptions {
  pipelines: Array<{
    id: string
    name: string
    is_default: boolean
    stages: Array<{ id: string; name: string; probability: number; color: string | null }>
  }>
  companies: DealReference[]
  contacts: Array<{ id: string; first_name: string; last_name: string | null; email: string | null }>
  assignees: Array<DealReference & { email: string }>
}
