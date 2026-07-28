import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Archive, Building2, Eye, LoaderCircle, Mail, Pencil, Phone, Plus, Search, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../app/AuthContext'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import type { Lead, LeadOptions, PaginatedLeads } from '../types/lead'
import RecordEngagementDrawer from '../components/engagement/RecordEngagementDrawer'

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required.').max(120),
  last_name: z.string().max(120).optional(),
  company_name: z.string().max(255).optional(),
  job_title: z.string().max(160).optional(),
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]),
  phone: z.string().max(40).optional(),
  source_id: z.string().optional(),
  status_id: z.string().min(1, 'Status is required.'),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  score: z.coerce.number().min(0).max(100).optional(),
  estimated_value: z.coerce.number().min(0).optional(),
  currency: z.string().length(3),
  description: z.string().max(10000).optional(),
})

type LeadFormValues = z.infer<typeof leadSchema>
type LeadFormInput = z.input<typeof leadSchema>

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500'

function LeadFormDialog({
  lead,
  options,
  currency,
  onClose,
}: {
  lead: Lead | null
  options: LeadOptions
  currency: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      first_name: lead?.first_name ?? '',
      last_name: lead?.last_name ?? '',
      company_name: lead?.company_name ?? '',
      job_title: lead?.job_title ?? '',
      email: lead?.email ?? '',
      phone: lead?.phone ?? '',
      source_id: lead?.source?.id ?? '',
      status_id: lead?.status?.id ?? options.statuses[0]?.id ?? '',
      assigned_to: lead?.assignee?.id ?? '',
      priority: lead?.priority ?? 'medium',
      score: lead?.score ?? 0,
      estimated_value: lead?.estimated_value ?? 0,
      currency: lead?.currency ?? currency,
      description: lead?.description ?? '',
    },
  })

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
      )
      return lead ? api.patch(`/api/v1/leads/${lead.id}`, payload) : api.post('/api/v1/leads', payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data?.errors) {
        Object.entries(error.response.data.errors as Record<string, string[]>).forEach(
          ([field, messages]) => {
            setError(field as keyof LeadFormInput, { message: messages[0] })
          },
        )
      } else setError('root', { message: 'The lead could not be saved. Please try again.' })
    },
  })

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-dialog-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 id="lead-dialog-title" className="font-semibold text-slate-900">
              {lead ? 'Edit lead' : 'Add lead'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Keep the contact and qualification details current.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close lead form" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form
          className="space-y-5 p-5"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          {errors.root && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <input {...register('first_name')} className={fieldClass} autoFocus />
            </Field>
            <Field label="Last name" error={errors.last_name?.message}>
              <input {...register('last_name')} className={fieldClass} />
            </Field>
            <Field label="Company" error={errors.company_name?.message}>
              <input {...register('company_name')} className={fieldClass} />
            </Field>
            <Field label="Job title" error={errors.job_title?.message}>
              <input {...register('job_title')} className={fieldClass} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={fieldClass} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register('phone')} className={fieldClass} />
            </Field>
            <Field label="Status" error={errors.status_id?.message}>
              <select {...register('status_id')} className={fieldClass}>
                {options.statuses.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source" error={errors.source_id?.message}>
              <select {...register('source_id')} className={fieldClass}>
                <option value="">No source</option>
                {options.sources.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority" error={errors.priority?.message}>
              <select {...register('priority')} className={fieldClass}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Assignee" error={errors.assigned_to?.message}>
              <select {...register('assigned_to')} className={fieldClass}>
                <option value="">Unassigned</option>
                {options.assignees.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lead score" error={errors.score?.message}>
              <input {...register('score')} type="number" min="0" max="100" className={fieldClass} />
            </Field>
            <Field label={`Estimated value (${currency})`} error={errors.estimated_value?.message}>
              <input
                {...register('estimated_value')}
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Notes" error={errors.description?.message}>
            <textarea {...register('description')} rows={4} className={cn(fieldClass, 'h-auto py-2')} />
          </Field>
          <input {...register('currency')} type="hidden" />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {lead ? 'Save changes' : 'Create lead'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

function LeadCard({
  lead,
  onDetails,
  onEdit,
  onArchive,
}: {
  lead: Lead
  onDetails: () => void
  onEdit: () => void
  onArchive: () => void
}) {
  const currency = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: lead.currency,
    maximumFractionDigits: 0,
  })
  const score = lead.score ?? 0
  const scoreColor = score >= 80 ? '#059669' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#94a3b8'
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          aria-label={`Lead score ${score}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            color: scoreColor,
            background: `conic-gradient(${scoreColor} ${score}%, #f1f5f9 ${score}% 100%)`,
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">{score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {lead.company_name || lead.full_name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {lead.company_name ? lead.full_name : lead.job_title || 'Individual lead'}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {lead.status?.name ?? 'No status'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                lead.priority === 'critical'
                  ? 'bg-red-50 text-red-700'
                  : lead.priority === 'high'
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-blue-50 text-blue-700',
              )}
            >
              {lead.priority}
            </span>
            {lead.source && <span className="text-xs text-slate-500">{lead.source.name}</span>}
            <span className="font-mono text-xs font-semibold text-slate-700">
              {currency.format(lead.estimated_value)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                aria-label={`Email ${lead.full_name}`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                aria-label={`Call ${lead.full_name}`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`View ${lead.full_name} details`}
                onClick={onDetails}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Edit ${lead.full_name}`}
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                aria-label={`Archive ${lead.full_name}`}
                onClick={onArchive}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function LeadsPage() {
  const { currentOrganization } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [dialogLead, setDialogLead] = useState<Lead | null | undefined>(undefined)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)

  const options = useQuery({
    queryKey: ['lead-options', currentOrganization?.id],
    queryFn: async () => (await api.get<{ data: LeadOptions }>('/api/v1/leads/options')).data.data,
    enabled: !!currentOrganization,
  })
  const params = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      page,
    }),
    [deferredSearch, status, priority, page],
  )
  const leads = useQuery({
    queryKey: ['leads', currentOrganization?.id, params],
    queryFn: async () => (await api.get<PaginatedLeads>('/api/v1/leads', { params })).data,
    enabled: !!currentOrganization,
    placeholderData: keepPreviousData,
  })
  const archive = useMutation({
    mutationFn: (lead: Lead) => api.delete(`/api/v1/leads/${lead.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Leads</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {leads.data?.meta.total ?? 0} leads in this organization
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogLead(null)} disabled={!options.data}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search leads</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className={cn(fieldClass, 'pl-9')}
              placeholder="Search leads..."
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={fieldClass + ' w-auto'}
          >
            <option value="">All statuses</option>
            {options.data?.statuses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value)
              setPage(1)
            }}
            className={fieldClass + ' w-auto'}
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5">
        {leads.isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        {leads.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Leads could not be loaded.
          </div>
        )}
        {leads.data?.data.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No leads found"
            description={
              search || status || priority
                ? 'Adjust the current search and filters.'
                : 'Add your first lead to begin building the sales pipeline.'
            }
          />
        )}
        {!!leads.data?.data.length && (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {leads.data.data.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onDetails={() => setDetailLead(lead)}
                onEdit={() => setDialogLead(lead)}
                onArchive={() => {
                  if (window.confirm(`Archive ${lead.full_name}?`)) archive.mutate(lead)
                }}
              />
            ))}
          </div>
        )}
        {(leads.data?.meta.last_page ?? 1) > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {leads.data?.meta.current_page} of {leads.data?.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (leads.data?.meta.last_page ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {dialogLead !== undefined && options.data && (
        <LeadFormDialog
          lead={dialogLead}
          options={options.data}
          currency={currentOrganization?.currency ?? 'USD'}
          onClose={() => setDialogLead(undefined)}
        />
      )}
      {detailLead && (
        <RecordEngagementDrawer
          type="lead"
          recordId={detailLead.id}
          title={detailLead.full_name}
          onClose={() => setDetailLead(null)}
        />
      )}
    </div>
  )
}
