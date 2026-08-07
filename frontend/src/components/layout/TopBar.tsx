import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Bot, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'
import Button from '../ui/Button'
import AiChatbotDialog from '../ai/AiChatbotDialog'
import { api } from '../../lib/api'

interface TopBarProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenMobile: () => void
}

export default function TopBar({ collapsed, onToggleSidebar, onOpenMobile }: TopBarProps) {
  const navigate = useNavigate()
  const { user, organizations, currentOrganization, switchOrganization, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const queryClient = useQueryClient()
  const results = useQuery({
    queryKey: ['global-search', deferredSearch, currentOrganization?.id],
    queryFn: async () =>
      (
        await api.get<{
          data: Array<{ id: string; type: string; title: string; subtitle: string | null; url: string }>
        }>('/api/v1/search', { params: { q: deferredSearch } })
      ).data.data,
    enabled: deferredSearch.trim().length >= 2,
  })
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (
        await api.get<{
          data: {
            data: Array<{
              id: string
              data: { title?: string; message?: string }
              read_at: string | null
              created_at: string
            }>
          }
        }>('/api/v1/notifications')
      ).data.data.data,
    enabled: notificationsOpen,
  })
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const go = (url: string) => {
    navigate(url)
    setSearch('')
    setCreateOpen(false)
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleSidebar}
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:flex"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      <label className="relative min-w-0 flex-1 sm:max-w-md">
        <span className="sr-only">Global search</span>
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
          placeholder="Search customers, deals, contacts..."
        />
        {search.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {results.isLoading && <p className="p-3 text-xs text-slate-500">Searching…</p>}
            {results.data?.length === 0 && <p className="p-3 text-xs text-slate-500">No matching records</p>}
            {results.data?.map((result) => (
              <button
                type="button"
                key={`${result.type}-${result.id}`}
                onClick={() => go(result.url)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{result.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {result.type} · {result.subtitle ?? 'No details'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </label>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative hidden sm:block">
          <Button
            size="sm"
            onClick={() => setCreateOpen((open) => !open)}
            aria-expanded={createOpen}
            aria-haspopup="menu"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Create
          </Button>
          {createOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            >
              {[
                ['Lead', '/leads'],
                ['Customer', '/companies'],
                ['Contact', '/contacts'],
                ['Deal', '/pipeline'],
                ['Task', '/tasks'],
                ['Quotation', '/quotations'],
                ['Ticket', '/support'],
              ].map(([label, url]) => (
                <button
                  key={url}
                  role="menuitem"
                  type="button"
                  onClick={() => go(url)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  New {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {notifications.data?.some((item) => !item.read_at) && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            )}
          </Button>
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold">Notifications</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Close notifications"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
                {notifications.data?.length === 0 && (
                  <p className="p-6 text-center text-sm text-slate-500">You’re all caught up.</p>
                )}
                {notifications.data?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markRead.mutate(item.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${!item.read_at ? 'bg-blue-50/60' : ''}`}
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {item.data.title ?? item.data.message ?? 'CRM notification'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {organizations.length > 1 && (
          <label className="hidden md:block">
            <span className="sr-only">Organization</span>
            <select
              className="h-8 max-w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600"
              value={currentOrganization?.id ?? ''}
              onChange={(event) => void switchOrganization(event.target.value)}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-1 rounded-lg p-1 hover:bg-slate-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {user?.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <ChevronDown className="hidden h-3 w-3 text-slate-400 sm:block" aria-hidden="true" />
          </button>
          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                My Profile
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => void logout()}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {!aiOpen && (
        <Button
          variant="primary"
          size="icon"
          aria-label="Open AI chatbot"
          onClick={() => setAiOpen(true)}
          className="fixed bottom-5 right-5 z-[79] h-14 w-14 rounded-full bg-violet-600 shadow-lg shadow-violet-900/25 hover:bg-violet-700"
        >
          <Bot className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}
      {aiOpen && <AiChatbotDialog onClose={() => setAiOpen(false)} />}
    </header>
  )
}
