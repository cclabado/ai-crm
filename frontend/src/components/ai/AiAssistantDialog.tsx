import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Bot, Copy, LoaderCircle, Sparkles, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import Button from '../ui/Button'

const features = [
  ['follow_up_email', 'Follow-up email'],
  ['interaction_summary', 'Interaction summary'],
  ['meeting_summary', 'Meeting summary'],
  ['next_actions', 'Suggested next actions'],
  ['proposal_description', 'Proposal description'],
  ['lead_priority', 'Lead priority'],
  ['sentiment', 'Customer sentiment'],
] as const

export default function AiAssistantDialog({ onClose }: { onClose: () => void }) {
  const [feature, setFeature] = useState<(typeof features)[number][0]>('follow_up_email')
  const [context, setContext] = useState('')
  const [result, setResult] = useState('')
  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post<{ data: { content: string } }>('/api/v1/ai/generate', { feature, context })).data.data,
    onSuccess: (data) => setResult(data.content),
  })
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  const error = axios.isAxiosError(mutation.error)
    ? (mutation.error.response?.data?.message ??
      Object.values(mutation.error.response?.data?.errors ?? {}).flat()[0])
    : mutation.error
      ? 'AI could not complete this request.'
      : null
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setResult('')
    mutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 id="ai-title" className="font-semibold">
                AI Assistant
              </h2>
              <p className="text-xs text-slate-500">Optional, administrator-controlled assistance</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close AI assistant" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Action</span>
            <select
              value={feature}
              onChange={(event) => setFeature(event.target.value as typeof feature)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {features.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Customer context</span>
            <textarea
              required
              minLength={10}
              maxLength={20000}
              rows={8}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Paste interaction history, meeting notes, or relevant deal context..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            />
          </label>
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {String(error)}
            </div>
          )}
          <Button type="submit" disabled={mutation.isPending || context.trim().length < 10}>
            {mutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </Button>
        </form>
        {result && (
          <div className="border-t border-slate-200 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Generated result</h3>
              <Button variant="ghost" size="sm" onClick={() => void navigator.clipboard.writeText(result)}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">
              {result}
            </pre>
          </div>
        )}
      </section>
    </div>
  )
}
