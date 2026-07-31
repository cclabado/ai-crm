import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, Contact, Eye, LoaderCircle, Mail, Phone } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import Button from '../components/ui/Button'
import RecordEngagementDrawer from '../components/engagement/RecordEngagementDrawer'
import { api } from '../lib/api'

type RecordValue = string | number | boolean | null
type DetailRecord = Record<string, RecordValue> & { public_id?: string; id?: string }

const labels: Record<string, string> = {
  industry: 'Industry',
  website: 'Website',
  email: 'Email',
  phone: 'Phone',
  job_title: 'Job title',
  mobile: 'Mobile',
  status: 'Status',
  description: 'Description',
}

export default function RecordDetailPage({ module }: { module: 'companies' | 'contacts' }) {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [engagementOpen, setEngagementOpen] = useState(false)
  const type = module === 'companies' ? 'company' : 'contact'
  const query = useQuery({
    queryKey: [module, recordId],
    queryFn: async () => (await api.get<{ data: DetailRecord }>(`/api/v1/${module}/${recordId}`)).data.data,
    enabled: Boolean(recordId),
  })
  const record = query.data
  const title = module === 'companies' ? String(record?.name ?? 'Company') : `${record?.first_name ?? ''} ${record?.last_name ?? ''}`.trim()

  if (query.isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-blue-600" /></div>
  }
  if (query.isError || !record) {
    return <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">This record could not be loaded.</div>
  }

  const icon = module === 'companies' ? Building2 : Contact
  const Icon = icon
  const visibleFields = module === 'companies'
    ? ['industry', 'website', 'email', 'phone', 'status', 'description']
    : ['job_title', 'email', 'phone', 'mobile', 'status', 'description']

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to {module}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{title || 'Contact'}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{module === 'companies' ? 'Customer profile' : 'Contact profile'}</p>
            </div>
          </div>
          <Button onClick={() => setEngagementOpen(true)}><Eye className="h-4 w-4" /> Open activity workspace</Button>
        </div>
      </div>
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Profile information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {visibleFields.map((key) => (
              <div key={key} className={key === 'description' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{labels[key]}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {key === 'website' && record[key] ? <a className="text-blue-600 hover:underline" href={String(record[key])} target="_blank" rel="noreferrer">{String(record[key])}</a> : key === 'email' && record[key] ? <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={`mailto:${record[key]}`}><Mail className="h-3.5 w-3.5" />{String(record[key])}</a> : key === 'phone' && record[key] ? <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={`tel:${record[key]}`}><Phone className="h-3.5 w-3.5" />{String(record[key])}</a> : String(record[key] ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep the relationship history, notes, tags, and files together in the activity workspace.</p>
          <Button className="mt-4" variant="secondary" onClick={() => setEngagementOpen(true)}>View timeline and notes</Button>
        </section>
      </div>
      {engagementOpen && <RecordEngagementDrawer type={type} recordId={String(record.public_id ?? record.id)} title={title} onClose={() => setEngagementOpen(false)} />}
    </div>
  )
}
