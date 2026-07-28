import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Archive,
  Download,
  Eye,
  FileDown,
  LoaderCircle,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useDeferredValue, useRef, useState, type FormEvent } from 'react'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'
import RecordEngagementDrawer from '../components/engagement/RecordEngagementDrawer'

type RecordValue = string | number | boolean | null
type ModuleRecord = Record<string, RecordValue> & { id?: string; public_id?: string }
type Field = {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
}
type Config = {
  title: string
  singular: string
  description: string
  columns: Array<{ key: string; label: string }>
  fields: Field[]
  defaults?: Record<string, RecordValue>
}

const configs: Record<string, Config> = {
  companies: {
    title: 'Customers',
    singular: 'company',
    description: 'Manage customer and prospect organizations.',
    columns: [
      { key: 'name', label: 'Company' },
      { key: 'industry', label: 'Industry' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
    ],
    fields: [
      { key: 'name', label: 'Company name', required: true },
      { key: 'industry', label: 'Industry' },
      { key: 'website', label: 'Website' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', type: 'select', options: ['prospect', 'customer', 'inactive'] },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    defaults: { status: 'prospect' },
  },
  contacts: {
    title: 'Contacts',
    singular: 'contact',
    description: 'Keep customer contact information organized.',
    columns: [
      { key: 'first_name', label: 'First name' },
      { key: 'last_name', label: 'Last name' },
      { key: 'job_title', label: 'Job title' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
    ],
    fields: [
      { key: 'first_name', label: 'First name', required: true },
      { key: 'last_name', label: 'Last name' },
      { key: 'job_title', label: 'Job title' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
    ],
    defaults: { status: 'active' },
  },
  tasks: {
    title: 'Tasks',
    singular: 'task',
    description: 'Plan calls, meetings, follow-ups, and deadlines.',
    columns: [
      { key: 'title', label: 'Task' },
      { key: 'type', label: 'Type' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'due_at', label: 'Due' },
    ],
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['task', 'call', 'meeting', 'follow_up'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['todo', 'in_progress', 'completed', 'cancelled'],
      },
      { key: 'due_at', label: 'Due date', type: 'datetime-local' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    defaults: { type: 'task', priority: 'medium', status: 'todo' },
  },
  products: {
    title: 'Products & Services',
    singular: 'product or service',
    description: 'Maintain the catalog used in deals and quotations.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'type', label: 'Type' },
      { key: 'unit_price', label: 'Unit price' },
      { key: 'is_active', label: 'Active' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'sku', label: 'SKU' },
      { key: 'type', label: 'Type', type: 'select', options: ['product', 'service'] },
      { key: 'unit_price', label: 'Unit price', type: 'number', required: true },
      { key: 'currency', label: 'Currency', required: true },
      { key: 'default_tax_rate', label: 'Tax rate (%)', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    defaults: { type: 'service', unit_price: 0, currency: 'USD', default_tax_rate: 0, is_active: true },
  },
  tickets: {
    title: 'Support Tickets',
    singular: 'ticket',
    description: 'Track customer issues, ownership, priority, and SLA.',
    columns: [
      { key: 'number', label: 'Ticket' },
      { key: 'subject', label: 'Subject' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
    ],
    fields: [
      { key: 'subject', label: 'Subject', required: true },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      { key: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'resolved', 'closed'] },
      { key: 'sla_due_at', label: 'SLA due', type: 'datetime-local' },
    ],
    defaults: { priority: 'medium', status: 'open' },
  },
  documents: {
    title: 'Documents',
    singular: 'document',
    description: 'Organize folders and CRM document metadata.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'mime_type', label: 'Format' },
      { key: 'version', label: 'Version' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['file', 'folder'] },
      { key: 'path', label: 'Storage path' },
      { key: 'mime_type', label: 'MIME type' },
    ],
    defaults: { type: 'folder', version: 1 },
  },
  quotations: {
    title: 'Quotations',
    singular: 'quotation',
    description: 'Create accurately calculated customer proposals.',
    columns: [
      { key: 'number', label: 'Quote' },
      { key: 'status', label: 'Status' },
      { key: 'currency', label: 'Currency' },
      { key: 'total', label: 'Total' },
      { key: 'expires_at', label: 'Expires' },
    ],
    fields: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      },
      { key: 'currency', label: 'Currency', required: true },
      { key: 'expires_at', label: 'Expires', type: 'date' },
      { key: 'line_item_name', label: 'Line item', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'unit_price', label: 'Unit price', type: 'number', required: true },
      { key: 'discount_rate', label: 'Discount (%)', type: 'number' },
      { key: 'tax_rate', label: 'Tax (%)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    defaults: { status: 'draft', currency: 'USD', quantity: 1, unit_price: 0, discount_rate: 0, tax_rate: 0 },
  },
  invoices: {
    title: 'Invoices',
    singular: 'invoice',
    description: 'Issue invoices and track payment status.',
    columns: [
      { key: 'number', label: 'Invoice' },
      { key: 'status', label: 'Status' },
      { key: 'currency', label: 'Currency' },
      { key: 'total', label: 'Total' },
      { key: 'amount_paid', label: 'Paid' },
    ],
    fields: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'],
      },
      { key: 'currency', label: 'Currency', required: true },
      { key: 'due_at', label: 'Due date', type: 'date' },
      { key: 'line_item_name', label: 'Line item', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'unit_price', label: 'Unit price', type: 'number', required: true },
      { key: 'discount_amount', label: 'Discount amount', type: 'number' },
      { key: 'tax_amount', label: 'Tax amount', type: 'number' },
      { key: 'amount_paid', label: 'Amount paid', type: 'number' },
    ],
    defaults: {
      status: 'draft',
      currency: 'USD',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      tax_amount: 0,
      amount_paid: 0,
    },
  },
}

function preparePayload(module: string, values: Record<string, RecordValue>) {
  const payload: Record<string, unknown> = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
  )
  if (module === 'quotations' || module === 'invoices') {
    const item: Record<string, RecordValue> = {
      name: String(payload.line_item_name ?? ''),
      quantity: Number(payload.quantity),
      unit_price: Number(payload.unit_price),
    }
    if (module === 'quotations')
      Object.assign(item, {
        discount_rate: Number(payload.discount_rate),
        tax_rate: Number(payload.tax_rate),
      })
    else
      Object.assign(item, {
        discount_amount: Number(payload.discount_amount),
        tax_amount: Number(payload.tax_amount),
      })
    payload.items = [item]
    for (const key of [
      'line_item_name',
      'quantity',
      'unit_price',
      'discount_rate',
      'tax_rate',
      'discount_amount',
      'tax_amount',
    ])
      delete payload[key]
  }
  return payload
}

function RecordDialog({
  module,
  config,
  record,
  onClose,
}: {
  module: string
  config: Config
  record: ModuleRecord | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, RecordValue>>({ ...config.defaults, ...(record ?? {}) })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      record
        ? api.patch(`/api/v1/${module}/${record.public_id ?? record.id}`, preparePayload(module, values))
        : api.post(`/api/v1/${module}`, preparePayload(module, values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [module] })
      onClose()
    },
    onError: (reason) =>
      setError(
        axios.isAxiosError(reason)
          ? (reason.response?.data?.message ?? 'The record could not be saved.')
          : 'The record could not be saved.',
      ),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    mutation.mutate()
  }
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-dialog-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 id="record-dialog-title" className="font-semibold text-slate-900">
              {record ? 'Edit' : 'Add'} {config.singular}
            </h2>
            <p className="text-xs text-slate-500">Fields marked required must be completed.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close form" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="space-y-4 p-5" onSubmit={submit}>
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && ' *'}
                </span>
                {field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={String(values[field.key] ?? '')}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    value={String(values[field.key] ?? '')}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    required={field.required}
                    type={field.type ?? 'text'}
                    value={String(values[field.key] ?? '')}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        [field.key]:
                          field.type === 'number' ? Number(event.target.value) : event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function OperationalModulePage({ module }: { module: keyof typeof configs }) {
  const config = configs[module]
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialog, setDialog] = useState<ModuleRecord | null | undefined>()
  const [detail, setDetail] = useState<ModuleRecord | null>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const [transferMessage, setTransferMessage] = useState('')
  const query = useQuery({
    queryKey: [module, deferredSearch],
    queryFn: async () =>
      (
        await api.get<{ data: ModuleRecord[] }>(`/api/v1/${module}`, {
          params: { search: deferredSearch || undefined },
        })
      ).data,
    placeholderData: keepPreviousData,
  })
  const remove = useMutation({
    mutationFn: (record: ModuleRecord) => api.delete(`/api/v1/${module}/${record.public_id ?? record.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [module] }),
  })
  const importContacts = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<{ message: string }>('/api/v1/contacts/import', form)
    },
    onSuccess: async ({ data }) => {
      setTransferMessage(data.message)
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: (reason) =>
      setTransferMessage(
        axios.isAxiosError(reason) ? (reason.response?.data?.message ?? 'Import failed.') : 'Import failed.',
      ),
  })
  const exportContacts = async () => {
    const response = await api.get<Blob>('/api/v1/contacts/export', { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const downloadPdf = async (record: ModuleRecord) => {
    const response = await api.get<Blob>(`/api/v1/${module}/${record.public_id ?? record.id}/pdf`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${module === 'quotations' ? 'quotation' : 'invoice'}-${String(record.number)}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{config.description}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {module === 'contacts' && (
              <>
                <input
                  ref={importInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) importContacts.mutate(file)
                    event.target.value = ''
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => importInput.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void exportContacts()}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setDialog(null)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        {transferMessage && (
          <p role="status" className="mt-3 text-sm text-slate-600">
            {transferMessage}
          </p>
        )}
        <label className="relative mt-4 block max-w-xs">
          <span className="sr-only">Search {config.title}</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}...`}
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
          />
        </label>
      </div>
      <div className="flex-1 overflow-x-auto p-4 sm:p-5">
        {query.isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        {query.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This module could not be loaded.
          </div>
        )}
        {query.data?.data.length === 0 && (
          <EmptyState
            icon={PackageOpen}
            title={`No ${config.title.toLowerCase()} yet`}
            description={`Add the first ${config.singular} to get started.`}
          />
        )}
        {!!query.data?.data.length && (
          <table className="w-full min-w-[700px] overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data.data.map((record) => (
                <tr key={String(record.public_id ?? record.id)} className="hover:bg-slate-50">
                  {config.columns.map((column) => (
                    <td key={column.key} className="max-w-64 truncate px-4 py-3 text-slate-700">
                      {typeof record[column.key] === 'boolean'
                        ? record[column.key]
                          ? 'Yes'
                          : 'No'
                        : String(record[column.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {(['quotations', 'invoices'] as string[]).includes(module) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Download PDF"
                          onClick={() => void downloadPdf(record)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      {(['companies', 'contacts', 'tickets'] as string[]).includes(module) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View record details"
                          onClick={() => setDetail(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit record"
                        onClick={() => setDialog(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Archive record"
                        onClick={() => window.confirm('Archive this record?') && remove.mutate(record)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {dialog !== undefined && (
        <RecordDialog module={module} config={config} record={dialog} onClose={() => setDialog(undefined)} />
      )}
      {detail && (
        <RecordEngagementDrawer
          type={module === 'companies' ? 'company' : module === 'contacts' ? 'contact' : 'ticket'}
          recordId={String(detail.public_id ?? detail.id)}
          title={String(
            detail.name ?? detail.subject ?? `${detail.first_name ?? ''} ${detail.last_name ?? ''}`,
          )}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
