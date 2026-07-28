import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../app/AuthContext'

interface DashboardData {
  metrics: {
    total_leads: number
    new_leads: number
    qualified_leads: number
    active_deals: number
    won_deals: number
    lost_deals: number
    sales_value: number
    conversion_rate: number
    tasks_due_today: number
    overdue_tasks: number
  }
  recent_activities: Array<{
    id: string
    type: string
    title: string
    description: string | null
    occurred_at: string
  }>
  charts: {
    pipeline: Array<{ label: string; total: number; value: number }>
    lead_sources: Array<{ label: string; value: number }>
    monthly_sales: Array<{ label: string; value: number }>
  }
}

const metricDefinitions = [
  ['Total Leads', 'total_leads', Users, 'bg-blue-50 text-blue-600'],
  ['New Leads', 'new_leads', Target, 'bg-violet-50 text-violet-600'],
  ['Qualified Leads', 'qualified_leads', CheckCircle2, 'bg-emerald-50 text-emerald-600'],
  ['Active Deals', 'active_deals', TrendingUp, 'bg-cyan-50 text-cyan-600'],
  ['Won Deals', 'won_deals', CircleDollarSign, 'bg-green-50 text-green-600'],
  ['Lost Deals', 'lost_deals', AlertTriangle, 'bg-red-50 text-red-600'],
  ['Sales Value', 'sales_value', BadgeDollarSign, 'bg-amber-50 text-amber-600'],
  ['Conversion Rate', 'conversion_rate', TrendingUp, 'bg-indigo-50 text-indigo-600'],
] as const

export default function DashboardPage() {
  const { currentOrganization } = useAuth()
  const dashboard = useQuery({
    queryKey: ['dashboard', currentOrganization?.id],
    queryFn: async () => (await api.get<{ data: DashboardData }>('/api/v1/dashboard')).data.data,
    enabled: !!currentOrganization,
  })

  const currency = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currentOrganization?.currency ?? 'USD',
    maximumFractionDigits: 0,
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            A live overview of {currentOrganization?.name ?? 'your organization'}.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          Updated from live CRM data
        </div>
      </div>

      {dashboard.isLoading && (
        <div className="flex min-h-64 items-center justify-center" role="status">
          <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          <span className="sr-only">Loading dashboard</span>
        </div>
      )}
      {dashboard.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The dashboard could not be loaded. Please try again.
        </div>
      )}
      {dashboard.data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {metricDefinitions.map(([label, key, Icon, color]) => {
              const value = dashboard.data.metrics[key]
              const display =
                key === 'sales_value'
                  ? currency.format(value)
                  : key === 'conversion_rate'
                    ? `${value}%`
                    : value.toLocaleString()
              return (
                <section
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                      {label}
                    </p>
                    <span
                      className={`hidden h-10 w-10 items-center justify-center rounded-xl sm:flex ${color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {display}
                  </p>
                </section>
              )
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">Sales Pipeline</h2>
              <p className="mt-1 text-xs text-slate-500">Deal value by stage</p>
              <div className="mt-5 h-64">
                {dashboard.data.charts.pipeline.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.data.charts.pipeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => currency.format(Number(value))} />
                      <Bar dataKey="value" fill="#2563eb" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
                    Pipeline data will appear when deals are added.
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-700">Due today</p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">
                    {dashboard.data.metrics.tasks_due_today}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-700">Overdue</p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {dashboard.data.metrics.overdue_tasks}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Lead Sources</h2>
              <div className="mt-3 h-60">
                {dashboard.data.charts.lead_sources.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboard.data.charts.lead_sources}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={82}
                        label
                      >
                        {dashboard.data.charts.lead_sources.map((_, index) => (
                          <Cell
                            key={index}
                            fill={['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'][index % 5]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No source data yet
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Monthly Sales</h2>
              <div className="mt-3 h-60">
                {dashboard.data.charts.monthly_sales.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboard.data.charts.monthly_sales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => currency.format(Number(value))} />
                      <Line dataKey="value" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Won sales will appear here.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Recent Activities</h2>
            {dashboard.data.recent_activities.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Activity will appear as your team works with CRM records.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {dashboard.data.recent_activities.map((activity) => (
                  <li key={activity.id} className="py-3">
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{activity.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
