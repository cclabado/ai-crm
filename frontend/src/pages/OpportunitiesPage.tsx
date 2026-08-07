import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleDollarSign, LoaderCircle, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../app/AuthContext'
import { api } from '../lib/api'
import type { Deal, DealPipeline } from '../types/deal'

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function OpportunitiesPage() {
  const { currentOrganization } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const pipeline = useQuery({
    queryKey: ['deal-pipeline', currentOrganization?.id, 'opportunities'],
    queryFn: async () => (await api.get<{ data: DealPipeline }>('/api/v1/deals/pipeline')).data.data,
    enabled: Boolean(currentOrganization),
  })
  const stages = useMemo(() => pipeline.data?.stages ?? [], [pipeline.data?.stages])
  const deals = useMemo(() => stages.flatMap((item) => item.deals).filter((deal) => {
    const haystack = `${deal.name} ${deal.company?.name ?? ''} ${deal.assignee?.name ?? ''}`.toLowerCase()
    return (!search || haystack.includes(search.toLowerCase())) && (!stage || deal.stage.id === stage)
  }), [search, stage, stages])

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold text-slate-900">Opportunities</h1><p className="mt-0.5 text-sm text-slate-500">Review and manage all sales opportunities in one list.</p></div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/pipeline')}><ArrowRight className="h-4 w-4" /> Open pipeline</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="relative min-w-56 flex-1 sm:max-w-sm"><span className="sr-only">Search opportunities</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunities..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></label>
          <select aria-label="Filter by pipeline stage" value={stage} onChange={(event) => setStage(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All stages</option>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto p-4 sm:p-5">
        {pipeline.isLoading && <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-blue-600" /></div>}
        {pipeline.isError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Opportunities could not be loaded.</div>}
        {!pipeline.isLoading && !pipeline.isError && deals.length === 0 && <EmptyState icon={CircleDollarSign} title="No opportunities found" description={search || stage ? 'Adjust the current filters.' : 'Create a deal in the sales pipeline to see it here.'} />}
        {deals.length > 0 && <table className="w-full min-w-[850px] overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Opportunity</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Probability</th><th className="px-4 py-3">Expected close</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{deals.map((deal: Deal) => <tr key={deal.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{deal.name}</td><td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{deal.stage.name}</span></td><td className="px-4 py-3 text-slate-600">{deal.company?.name ?? '—'}</td><td className="px-4 py-3 text-slate-600">{deal.assignee?.name ?? 'Unassigned'}</td><td className="px-4 py-3 font-medium text-slate-800">{money(deal.value, deal.currency)}</td><td className="px-4 py-3 text-slate-600">{deal.probability}%</td><td className="px-4 py-3 text-slate-600">{deal.expected_close_date ? new Date(`${deal.expected_close_date}T00:00:00`).toLocaleDateString() : '—'}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/pipeline/deal/${deal.id}`)}>View</Button></td></tr>)}</tbody></table>}
      </div>
    </div>
  )
}
