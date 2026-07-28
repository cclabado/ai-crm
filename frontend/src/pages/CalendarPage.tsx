import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { api } from '../lib/api'

interface CalendarTask {
  public_id: string
  title: string
  type: string
  priority: string
  status: string
  starts_at: string | null
  due_at: string | null
}
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)
  const tasks = useQuery({
    queryKey: ['calendar-tasks', dateKey(first)],
    queryFn: async () =>
      (
        await api.get<{ data: CalendarTask[] }>('/api/v1/tasks', {
          params: { date_from: first.toISOString(), date_to: last.toISOString(), per_page: 100 },
        })
      ).data.data,
  })
  const days = (() => {
    const values: Date[] = []
    const start = new Date(first)
    start.setDate(start.getDate() - start.getDay())
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      values.push(day)
    }
    return values
  })()
  const byDay = useMemo(() => {
    const grouped = new Map<string, CalendarTask[]>()
    for (const task of tasks.data ?? []) {
      if (!task.due_at) continue
      const key = dateKey(new Date(task.due_at))
      grouped.set(key, [...(grouped.get(key) ?? []), task])
    }
    return grouped
  }, [tasks.data])
  const move = (months: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1))
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Calendar</h1>
            <p className="text-sm text-slate-500">Calls, meetings, tasks, and follow-up deadlines.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/tasks')}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-44 text-center text-sm font-semibold">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          >
            Today
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto p-4 sm:p-5">
        {tasks.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="min-w-[760px] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {weekdayNames.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = dateKey(day)
                const dayTasks = byDay.get(key) ?? []
                const outside = day.getMonth() !== cursor.getMonth()
                const today = dateKey(day) === dateKey(new Date())
                return (
                  <section
                    key={key}
                    aria-label={day.toDateString()}
                    className={`min-h-28 border-b border-r border-slate-100 p-2 ${outside ? 'bg-slate-50/70' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${today ? 'bg-blue-600 font-bold text-white' : outside ? 'text-slate-300' : 'text-slate-600'}`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          type="button"
                          key={task.public_id}
                          onClick={() => navigate('/tasks')}
                          className={`block w-full truncate rounded px-2 py-1 text-left text-[10px] font-medium ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 line-through' : task.priority === 'critical' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <p className="px-1 text-[10px] text-slate-400">+{dayTasks.length - 3} more</p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}
        {tasks.data?.length === 0 && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
            <CalendarDays className="h-4 w-4" />
            No deadlines this month.
          </div>
        )}
      </div>
    </div>
  )
}
