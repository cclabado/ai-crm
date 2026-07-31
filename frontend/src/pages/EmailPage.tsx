import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Mail, Plus, RefreshCw, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'

interface Thread {
  public_id: string
  subject: string
  last_message_at: string
  messages: Array<{ public_id: string; body_text: string; to_addresses: string[]; status: string }>
}
export default function EmailPage() {
  const client = useQueryClient()
  const [compose, setCompose] = useState(false)
  const [form, setForm] = useState({ to: '', subject: '', body: '' })
  const [notice, setNotice] = useState('')
  const query = useQuery({
    queryKey: ['email-threads'],
    queryFn: async () => (await api.get<{ data: Thread[] }>('/api/v1/email/threads')).data.data,
  })
  const send = useMutation({
    mutationFn: () =>
      api.post('/api/v1/email/send', {
        to: form.to
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        subject: form.subject,
        body: form.body,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['email-threads'] })
      setCompose(false)
      setForm({ to: '', subject: '', body: '' })
      setNotice('Email queued for delivery.')
    },
  })
  const retry = useMutation({
    mutationFn: (messageId: string) => api.post(`/api/v1/email/messages/${messageId}/retry`),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['email-threads'] }); setNotice('Email queued for retry.') },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    send.mutate()
  }
  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Email</h1>
            <p className="text-sm text-slate-500">CRM correspondence and follow-ups.</p>
          </div>
          <Button size="sm" onClick={() => setCompose(true)}>
            <Plus className="h-4 w-4" />
            Compose
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {notice && (
          <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {query.isLoading && <LoaderCircle className="mx-auto mt-20 h-7 w-7 animate-spin text-blue-600" />}
        {query.data?.length === 0 && (
          <EmptyState
            icon={Mail}
            title="No email threads"
            description="Compose an email to begin a customer conversation."
          />
        )}
        {query.data?.map((thread) => (
          <article key={thread.public_id} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold text-slate-900">{thread.subject}</h2>
              <time className="text-xs text-slate-400">
                {new Date(thread.last_message_at).toLocaleString()}
              </time>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm text-slate-600">{thread.messages[0]?.body_text}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${thread.messages[0]?.status === 'failed' ? 'bg-red-50 text-red-700' : thread.messages[0]?.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{thread.messages[0]?.status ?? 'unknown'}</span></div>
            {thread.messages[0]?.status === 'failed' && <Button variant="secondary" size="sm" className="mt-3" onClick={() => retry.mutate(thread.messages[0]?.public_id ?? '')} disabled={retry.isPending}><RefreshCw className="h-3.5 w-3.5" /> Retry delivery</Button>}
          </article>
        ))}
      </div>
      {compose && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5">
          <form
            onSubmit={submit}
            className="w-full space-y-4 rounded-t-2xl bg-white p-5 sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Compose email</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close compose"
                onClick={() => setCompose(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">To</span>
              <input
                type="text"
                required
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="name@example.com"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Subject</span>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Message</span>
              <textarea
                required
                rows={8}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm"
              />
            </label>
            <Button type="submit" disabled={send.isPending}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
