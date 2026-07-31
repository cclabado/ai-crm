import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { LoaderCircle, Pencil, Plus, Power, Save, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../components/ui/Button'
import { useAuth } from '../app/AuthContext'
import { api } from '../lib/api'
import {
  aiProviderOptions,
  currencyOptions,
  dateFormatOptions,
  emailEncryptionOptions,
  includeCurrentOption,
  localeOptions,
  semanticTypeOptions,
  timezoneOptions,
  type SelectOption,
} from '../lib/settingsOptions'

type CatalogItem = {
  id: string
  name: string
  color?: string
  position: number
  is_active: boolean
  semantic_type?: string
  probability?: number
}
type Pipeline = { public_id: string; name: string; stages: CatalogItem[] }
type Preference = { event: string; in_app: boolean; email: boolean }
type StoredSetting = { key: string; value: string | null; configured: boolean | null }
interface SettingsData {
  company: { name: string; logo_url?: string | null; currency: string; timezone: string; locale: string; date_format: string }
  settings: Record<string, StoredSetting[]>
  lead_sources: CatalogItem[]
  lead_statuses: CatalogItem[]
  pipelines: Pipeline[]
  notification_preferences: Preference[]
  ai: {
    provider: string
    base_url?: string
    model?: string
    is_enabled: boolean
    mock_mode: boolean
    daily_request_limit?: number
    has_api_key: boolean
  }
}
const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
const events = [
  'lead_assignment',
  'task_assignment',
  'upcoming_deadline',
  'overdue_task',
  'deal_stage_update',
  'quotation_response',
]

export default function SettingsPage() {
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<{ data: SettingsData }>('/api/v1/settings')).data.data,
  })
  if (query.isError)
    return (
      <div role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-red-700">
        Settings could not be loaded.
      </div>
    )
  if (query.isLoading || !query.data)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    )
  return <SettingsForms key={JSON.stringify(query.data)} initial={query.data} />
}

function SettingsForms({ initial }: { initial: SettingsData }) {
  const { refresh: refreshAuth } = useAuth()
  const queryClient = useQueryClient()
  const [company, setCompany] = useState(initial.company)
  const [ai, setAi] = useState<SettingsData['ai'] & { api_key?: string }>({ ...initial.ai, api_key: '' })
  const emailValues = Object.fromEntries(
    (initial.settings.email ?? []).map((item) => [item.key, item.value ?? '']),
  )
  const [email, setEmail] = useState({
    from_name: emailValues.from_name ?? initial.company.name,
    from_address: emailValues.from_address ?? '',
    host: emailValues.host ?? '',
    port: Number(emailValues.port || 587),
    encryption: emailValues.encryption ?? 'tls',
    username: emailValues.username ?? '',
    password: '',
  })
  const [logoMessage, setLogoMessage] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const logoUpload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return api.post('/api/v1/settings/logo', form)
    },
    onSuccess: async () => {
      setLogoMessage('Logo updated.')
      await Promise.all([refreshAuth(), refreshSettings()])
    },
    onError: () => setLogoMessage('Upload failed. Use PNG, JPG, or WebP up to 2 MB.'),
  })
  const existingPrefs = new Map(initial.notification_preferences.map((item) => [item.event, item]))
  const [preferences, setPreferences] = useState<Preference[]>(
    events.map((event) => existingPrefs.get(event) ?? { event, in_app: true, email: true }),
  )
  const refreshSettings = () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  const saveCompany = useMutation({
    mutationFn: () => api.put('/api/v1/settings', company),
    onSuccess: async () => {
      await Promise.all([refreshAuth(), refreshSettings()])
    },
  })
  const saveAi = useMutation({
    mutationFn: () => api.put('/api/v1/settings/ai', ai),
    onSuccess: refreshSettings,
  })
  const saveEmail = useMutation({
    mutationFn: () => api.put('/api/v1/settings/email', email),
    onSuccess: refreshSettings,
  })
  const testEmail = useMutation({
    mutationFn: () => api.post('/api/v1/settings/email/test'),
    onSuccess: ({ data }) => setEmailMessage(data.message),
    onError: (error) => setEmailMessage(axios.isAxiosError(error) ? (error.response?.data?.message ?? 'SMTP test failed.') : 'SMTP test failed.'),
  })
  const savePreferences = useMutation({
    mutationFn: () => api.put('/api/v1/settings/notifications', { preferences }),
    onSuccess: refreshSettings,
  })
  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Company, workflow, communications, and optional AI configuration.
        </p>
      </div>
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-2">
        <SettingsCard
          title="Company information"
          mutation={saveCompany}
          onSubmit={() => saveCompany.mutate()}
        >
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
            {initial.company.logo_url ? (
              <img src={initial.company.logo_url} alt="Company logo" className="h-12 w-12 rounded object-contain" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">Logo</span>
            )}
            <span className="text-sm text-slate-600">
              Upload company logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) logoUpload.mutate(file)
                  event.target.value = ''
                }}
              />
            </span>
          </label>
          {logoMessage && <p role="status" className="text-xs text-slate-500">{logoMessage}</p>}
          <Field
            label="Company name"
            value={company.name}
            onChange={(name) => setCompany({ ...company, name })}
          />
          <SelectField
            label="Currency"
            value={company.currency}
            options={includeCurrentOption(currencyOptions, company.currency)}
            onChange={(currency) => setCompany({ ...company, currency })}
          />
          <SelectField
            label="Time zone"
            value={company.timezone}
            options={includeCurrentOption(timezoneOptions, company.timezone)}
            onChange={(timezone) => setCompany({ ...company, timezone })}
          />
          <SelectField
            label="Language and locale"
            value={company.locale}
            options={includeCurrentOption(localeOptions, company.locale)}
            onChange={(locale) => setCompany({ ...company, locale })}
          />
          <SelectField
            label="Date format"
            value={company.date_format}
            options={includeCurrentOption(dateFormatOptions, company.date_format)}
            onChange={(date_format) => setCompany({ ...company, date_format })}
          />
        </SettingsCard>
        <SettingsCard title="Email delivery" mutation={saveEmail} onSubmit={() => saveEmail.mutate()}>
          <p className="text-xs text-slate-500">
            SMTP credentials are encrypted. Leave the password blank to keep the stored value.
          </p>
          {(['from_name', 'from_address', 'host', 'username'] as const).map((key) => (
            <Field
              key={key}
              label={key.replaceAll('_', ' ')}
              value={String(email[key])}
              onChange={(value) => setEmail({ ...email, [key]: value })}
            />
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Port"
              type="number"
              value={String(email.port)}
              onChange={(value) => setEmail({ ...email, port: Number(value) })}
            />
            <SelectField
              label="Encryption"
              value={email.encryption}
              options={emailEncryptionOptions}
              onChange={(encryption) => setEmail({ ...email, encryption })}
            />
          </div>
          <Field
            label="Password"
            type="password"
            value={email.password}
            onChange={(value) => setEmail({ ...email, password: value })}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => testEmail.mutate()} disabled={testEmail.isPending}>Test SMTP connection</Button>
            {emailMessage && <span role="status" className="text-xs text-slate-500">{emailMessage}</span>}
          </div>
        </SettingsCard>
        <CatalogCard title="Lead sources" endpoint="lead-sources" items={initial.lead_sources} />
        <CatalogCard title="Lead statuses" endpoint="lead-statuses" items={initial.lead_statuses} semantic />
        <SettingsCard
          title="Notification preferences"
          mutation={savePreferences}
          onSubmit={() => savePreferences.mutate()}
        >
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm">
            <strong>Event</strong>
            <strong>In app</strong>
            <strong>Email</strong>
            {preferences.map((preference, index) => (
              <div className="contents" key={preference.event}>
                <span className="capitalize">{preference.event.replaceAll('_', ' ')}</span>
                {(['in_app', 'email'] as const).map((channel) => (
                  <input
                    aria-label={`${preference.event} ${channel}`}
                    key={channel}
                    type="checkbox"
                    checked={preference[channel]}
                    onChange={(event) =>
                      setPreferences(
                        preferences.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, [channel]: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </SettingsCard>
        <SettingsCard title="Optional AI" mutation={saveAi} onSubmit={() => saveAi.mutate()}>
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <ShieldCheck className="mr-1 inline h-4 w-4" />
            Disabled by default; credentials are encrypted and core CRM features remain independent.
          </div>
          <SelectField
            label="Provider"
            value={ai.provider}
            options={includeCurrentOption(aiProviderOptions, ai.provider)}
            onChange={(value) => setAi({ ...ai, provider: value })}
          />
          <Field
            label="API base URL"
            value={ai.base_url ?? ''}
            onChange={(value) => setAi({ ...ai, base_url: value })}
          />
          <Field label="Model" value={ai.model ?? ''} onChange={(value) => setAi({ ...ai, model: value })} />
          <Field
            label={`API key ${ai.has_api_key ? '(stored)' : ''}`}
            type="password"
            value={ai.api_key ?? ''}
            onChange={(value) => setAi({ ...ai, api_key: value })}
          />
          <Field
            label="Daily request limit"
            type="number"
            value={String(ai.daily_request_limit ?? 50)}
            onChange={(value) => setAi({ ...ai, daily_request_limit: Number(value) })}
          />
          <Toggle
            label="Enable AI"
            checked={ai.is_enabled}
            onChange={(checked) => setAi({ ...ai, is_enabled: checked })}
          />
          <Toggle
            label="Mock mode"
            checked={ai.mock_mode}
            onChange={(checked) => setAi({ ...ai, mock_mode: checked })}
          />
        </SettingsCard>
        {initial.pipelines.map((pipeline) => (
          <CatalogCard
            key={pipeline.public_id}
            title={`${pipeline.name} stages`}
            endpoint="pipeline-stages"
            pipelineId={pipeline.public_id}
            items={pipeline.stages}
            semantic
          />
        ))}
      </div>
    </div>
  )
}

function CatalogCard({
  title,
  endpoint,
  pipelineId,
  items,
  semantic = false,
}: {
  title: string
  endpoint: string
  pipelineId?: string
  items: CatalogItem[]
  semantic?: boolean
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('open')
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editKind, setEditKind] = useState('open')
  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/api/v1/settings/catalog/${endpoint}`, {
        id: editing?.id,
        name: editing ? editName : name,
        pipeline_id: pipelineId,
        position: editing?.position ?? items.length,
        semantic_type: editing ? editKind : kind,
        probability: editing ? (editKind === 'won' ? 100 : editKind === 'lost' ? 0 : editing.probability ?? 0) : kind === 'won' ? 100 : 0,
        is_active: editing?.is_active ?? true,
      }),
    onSuccess: async () => {
      setName('')
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
  const toggleMutation = useMutation({
    mutationFn: (item: CatalogItem) => api.put(`/api/v1/settings/catalog/${endpoint}`, {
      id: item.id,
      name: item.name,
      pipeline_id: pipelineId,
      position: item.position,
      semantic_type: item.semantic_type ?? 'open',
      probability: item.probability ?? 0,
      is_active: !item.is_active,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })
  const toggleActive = (item: CatalogItem) => {
    toggleMutation.mutate(item)
  }
  return (
    <SettingsCard title={title} mutation={mutation} onSubmit={() => mutation.mutate()}>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="min-w-0 flex-1 truncate">{item.name}{item.probability !== undefined ? ` · ${item.probability}%` : ''}</span>
            <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => { setEditing(item); setEditName(item.name); setEditKind(item.semantic_type ?? 'open') }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`${item.is_active ? 'Deactivate' : 'Activate'} ${item.name}`} onClick={() => toggleActive(item)}><Power className={`h-3.5 w-3.5 ${item.is_active ? 'text-emerald-600' : 'text-slate-400'}`} /></Button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-semibold text-blue-800">Edit {editing.name}</p>
          <div className="flex gap-2">
            <input required value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClass} />
            {semantic && <select aria-label="Edit semantic type" value={editKind} onChange={(event) => setEditKind(event.target.value)} className={`${inputClass} max-w-32`}>{semanticTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
            <Button type="button" size="sm" onClick={() => mutation.mutate()}>Save</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add a new option"
          className={inputClass}
        />
        {semantic && (
          <select
            aria-label="Semantic type"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className={`${inputClass} max-w-32`}
          >
            {semanticTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </SettingsCard>
  )
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium capitalize text-slate-700">{label}</span>
      <input
        required={type !== 'password'}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </label>
  )
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}
function SettingsCard({
  title,
  children,
  onSubmit,
  mutation,
}: {
  title: string
  children: ReactNode
  onSubmit: () => void
  mutation: { isPending: boolean; isError: boolean; isSuccess: boolean }
}) {
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {children}
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Changes could not be saved.
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-emerald-600">
          Saved successfully.
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : title.includes('Lead') || title.includes('stages') ? (
          <Plus className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {title.includes('Lead') || title.includes('stages') ? 'Add option' : 'Save changes'}
      </Button>
    </form>
  )
}
