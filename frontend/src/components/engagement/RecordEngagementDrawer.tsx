import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Activity,
  Download,
  FileText,
  LoaderCircle,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  Save,
  Send,
  Tag,
  Upload,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import Button from '../ui/Button'

interface EngagementData {
  notes: Array<{ public_id: string; body: string; is_private: boolean; created_at: string }>
  activities: Array<{
    public_id: string
    title: string
    description: string | null
    type: string
    occurred_at: string
    actor?: { name: string }
  }>
  attachments: Array<{
    public_id: string
    original_name: string
    mime_type: string
    size: number
    created_at: string
  }>
  tags: Array<{ id: number; name: string; color: string | null }>
}

interface TicketMessage {
  public_id: string
  body: string
  is_internal: boolean
  sent_at: string
  user?: { name: string }
  contact?: { first_name: string; last_name: string | null }
}

export default function RecordEngagementDrawer({
  type,
  recordId,
  title,
  onClose,
}: {
  type: 'lead' | 'company' | 'contact' | 'deal' | 'ticket'
  recordId: string
  title: string
  onClose: () => void
}) {
  const client = useQueryClient()
  const [tab, setTab] = useState<'timeline' | 'notes' | 'files' | 'conversation'>('timeline')
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [internalReply, setInternalReply] = useState(false)
  const [tagText, setTagText] = useState('')
  const key = ['engagement', type, recordId]
  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<{ data: EngagementData }>(`/api/v1/engagement/${type}/${recordId}`)).data.data,
  })
  const messages = useQuery({
    queryKey: ['ticket-messages', recordId],
    queryFn: async () =>
      (await api.get<{ data: TicketMessage[] }>(`/api/v1/tickets/${recordId}/messages`)).data.data,
    enabled: type === 'ticket',
  })
  const refresh = () => client.invalidateQueries({ queryKey: key })
  const addNote = useMutation({
    mutationFn: () => api.post(`/api/v1/engagement/${type}/${recordId}/notes`, { body: note }),
    onSuccess: async () => {
      setNote('')
      await refresh()
    },
  })
  const saveTags = useMutation({
    mutationFn: () =>
      api.put(`/api/v1/engagement/${type}/${recordId}/tags`, {
        tags: tagText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    onSuccess: refresh,
  })
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/api/v1/engagement/${type}/${recordId}/attachments`, form)
    },
    onSuccess: refresh,
  })
  const sendReply = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/tickets/${recordId}/messages`, {
        body: reply,
        is_internal: internalReply,
      }),
    onSuccess: async () => {
      setReply('')
      await client.invalidateQueries({ queryKey: ['ticket-messages', recordId] })
      await refresh()
    },
  })
  const error = [
    query.error,
    messages.error,
    addNote.error,
    saveTags.error,
    upload.error,
    sendReply.error,
  ].find(Boolean)
  const errorText = axios.isAxiosError(error)
    ? (error.response?.data?.message ?? 'The action could not be completed.')
    : error
      ? 'The action could not be completed.'
      : null
  const submitNote = (event: FormEvent) => {
    event.preventDefault()
    addNote.mutate()
  }
  const download = async (file: EngagementData['attachments'][number]) => {
    const response = await api.get(`/api/v1/engagement/${type}/${recordId}/attachments/${file.public_id}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = file.original_name
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-950/30"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="engagement-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Record details</p>
            <h2 id="engagement-title" className="mt-1 font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close record details" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="border-b border-slate-200 px-5 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {query.data?.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Comma-separated tags</span>
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                placeholder="Tags, separated by commas"
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
              />
            </label>
            <Button variant="secondary" size="sm" onClick={() => saveTags.mutate()}>
              <Save className="h-4 w-4" />
              Tags
            </Button>
          </div>
        </div>
        <div role="tablist" className="flex border-b border-slate-200 px-5">
          {(
            [
              ['timeline', Activity],
              ['notes', MessageSquareText],
              ['files', Paperclip],
              ...(type === 'ticket' ? ([['conversation', MessageCircle]] as const) : []),
            ] as const
          ).map(([value, Icon]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium capitalize ${tab === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}
            >
              <Icon className="h-4 w-4" />
              {value}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {query.isLoading && <LoaderCircle className="mx-auto mt-20 h-7 w-7 animate-spin text-blue-600" />}
          {errorText && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorText}
            </div>
          )}
          {tab === 'timeline' && (
            <div className="space-y-3">
              {query.data?.activities.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">No activity yet.</p>
              )}
              {query.data?.activities.map((item) => (
                <article key={item.public_id} className="border-l-2 border-blue-100 pl-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <time className="text-[10px] text-slate-400">
                        {new Date(item.occurred_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.actor?.name ?? 'System'} · {item.type}
                    </p>
                    {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {tab === 'notes' && (
            <>
              <form onSubmit={submitNote} className="mb-5 space-y-2">
                <textarea
                  required
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note…"
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                />
                <Button type="submit" size="sm" disabled={addNote.isPending}>
                  Add note
                </Button>
              </form>
              <div className="space-y-3">
                {query.data?.notes.map((item) => (
                  <article key={item.public_id} className="rounded-xl border border-slate-200 p-4">
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{item.body}</p>
                    <time className="mt-2 block text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'files' && (
            <>
              <label className="mb-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-sm font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) upload.mutate(file)
                  }}
                />
              </label>
              <div className="space-y-2">
                {query.data?.attachments.map((file) => (
                  <article
                    key={file.public_id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.original_name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${file.original_name}`}
                      onClick={() => void download(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'conversation' && type === 'ticket' && (
            <>
              <div className="mb-5 space-y-3">
                {messages.data?.map((message) => (
                  <article
                    key={message.public_id}
                    className={`rounded-xl p-4 ${message.is_internal ? 'border border-amber-200 bg-amber-50' : 'bg-blue-50'}`}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-700">
                        {message.user?.name ??
                          `${message.contact?.first_name ?? 'Customer'} ${message.contact?.last_name ?? ''}`}
                        {message.is_internal && ' · Internal note'}
                      </p>
                      <time className="text-[10px] text-slate-400">
                        {new Date(message.sent_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                  </article>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  sendReply.mutate()
                }}
                className="sticky bottom-0 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
              >
                <textarea
                  required
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Write a support reply…"
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={internalReply}
                      onChange={(event) => setInternalReply(event.target.checked)}
                    />
                    Internal note
                  </label>
                  <Button type="submit" size="sm" disabled={sendReply.isPending}>
                    <Send className="h-4 w-4" />
                    Reply
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
