import { useQuery } from '@tanstack/react-query'
import { Download, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Button from '../components/ui/Button'
import { api } from '../lib/api'

interface ReportData {
  leads_by_status: Array<{ label: string; total: number }>
  leads_by_source: Array<{ label: string; total: number }>
  pipeline: Array<{ label: string; total: number; value: number }>
  monthly_sales: Array<{ label: string; value: number }>
  sales_by_rep: Array<{ label: string; total: number; value: number }>
  lead_aging: Array<{ label: string; total: number }>
  tasks: { total: number; completed: number; overdue: number }
}

function ChartCard({
  title,
  data,
  dataKey = 'total',
}: {
  title: string
  data: Array<Record<string, unknown>>
  dataKey?: string
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {data.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={dataKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">No report data yet</div>
      )}
    </section>
  )
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const report = useQuery({
    queryKey: ['reports', dateFrom, dateTo],
    queryFn: async () => (await api.get<{ data: ReportData }>('/api/v1/reports', { params: { date_from: dateFrom || undefined, date_to: dateTo || undefined } })).data.data,
  })
  const download = async (type: 'leads' | 'deals' | 'tasks') => {
    const response = await api.get('/api/v1/reports/export', { params: { type, date_from: dateFrom || undefined, date_to: dateTo || undefined }, responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-report.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="mt-0.5 text-sm text-slate-500">Live performance data from this organization.</p>
          </div>
          <div className="flex gap-2">
            <input aria-label="Report start date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
            <input aria-label="Report end date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
            {(dateFrom || dateTo) && <Button variant="ghost" size="icon" aria-label="Clear report dates" onClick={() => { setDateFrom(''); setDateTo('') }}><RotateCcw className="h-4 w-4" /></Button>}
            {(['leads', 'deals', 'tasks'] as const).map((type) => (
              <Button key={type} variant="secondary" size="sm" onClick={() => void download(type)}>
                <Download className="h-4 w-4" />
                {type}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {report.isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        {report.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Reports could not be loaded.
          </div>
        )}
        {report.data && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {Object.entries(report.data.tasks).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Tasks {label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Leads by status" data={report.data.leads_by_status} />
              <ChartCard title="Leads by source" data={report.data.leads_by_source} />
              <ChartCard title="Pipeline value" data={report.data.pipeline} dataKey="value" />
              <ChartCard title="Monthly won sales" data={report.data.monthly_sales} dataKey="value" />
              <ChartCard title="Won sales by representative" data={report.data.sales_by_rep} dataKey="value" />
              <ChartCard title="Lead aging" data={report.data.lead_aging} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
