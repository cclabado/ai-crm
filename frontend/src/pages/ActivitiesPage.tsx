import { useQuery } from '@tanstack/react-query'
import { Activity, LoaderCircle } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'

interface ActivityRecord {
  public_id: string
  type: string
  title: string
  description: string | null
  occurred_at: string
  actor?: { name: string }
}
export default function ActivitiesPage() {
  const query = useQuery({
    queryKey: ['activities'],
    queryFn: async () => (await api.get<{ data: ActivityRecord[] }>('/api/v1/activities')).data.data,
  })
  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold">Activity Timeline</h1>
        <p className="mt-0.5 text-sm text-slate-500">A chronological audit of important CRM actions.</p>
      </div>
      <div className="p-4 sm:p-5">
        {query.isLoading && <LoaderCircle className="mx-auto mt-20 h-7 w-7 animate-spin text-blue-600" />}
        {query.data?.length === 0 && (
          <EmptyState
            icon={Activity}
            title="No activities yet"
            description="Important CRM events will appear here automatically."
          />
        )}
        {query.data?.map((item) => (
          <article
            key={item.public_id}
            className="relative border-l-2 border-blue-100 pb-6 pl-5 before:absolute before:-left-[7px] before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-blue-600"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                <time className="text-xs text-slate-400">{new Date(item.occurred_at).toLocaleString()}</time>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.actor?.name ?? 'System'} · {item.type}
              </p>
              {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
