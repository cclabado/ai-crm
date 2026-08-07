import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Bot, LoaderCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Button from '../ui/Button'
import { api } from '../../lib/api'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AiChatbotDialog({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Hi! I’m your CRM assistant. Ask me about follow-ups, customers, deals, tasks, or proposals.' }])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const mutation = useMutation({
    mutationFn: async (context: string) => (await api.post<{ data: { content: string } }>('/api/v1/ai/generate', { feature: 'chat', context })).data.data.content,
    onSuccess: (content) => setMessages((current) => [...current, { role: 'assistant', content }]),
  })
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, mutation.isPending])
  const error = axios.isAxiosError(mutation.error) ? mutation.error.response?.data?.message ?? 'The assistant could not respond.' : mutation.error ? 'The assistant could not respond.' : null
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || mutation.isPending) return
    const next = [...messages, { role: 'user' as const, content: message }]
    setMessages(next)
    setInput('')
    mutation.mutate(next.map((item) => `${item.role}: ${item.content}`).join('\n'))
  }
  return <div className="fixed inset-0 z-[80] flex items-end justify-end bg-slate-950/25 sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="chatbot-title" className="flex h-[min(680px,100vh)] w-full flex-col bg-white shadow-2xl sm:h-[min(680px,calc(100vh-2.5rem))] sm:max-w-md sm:rounded-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span><div><h2 id="chatbot-title" className="text-sm font-semibold">CRM AI Chatbot</h2><p className="text-[11px] text-slate-500">Optional assistant · mock mode supported</p></div></div><Button variant="ghost" size="icon" aria-label="Close chatbot" onClick={onClose}><X className="h-4 w-4" /></Button></div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>{message.content}</div>)}{mutation.isPending && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Thinking…</div>}{error && <div role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>}<div ref={endRef} /></div><form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3"><label className="sr-only" htmlFor="chatbot-message">Message</label><input id="chatbot-message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your CRM assistant…" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" /><Button type="submit" size="icon" aria-label="Send message" disabled={!input.trim() || mutation.isPending}><Send className="h-4 w-4" /></Button></form></section></div>
}
