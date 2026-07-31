import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Eye,
  GripVertical,
  LoaderCircle,
  Plus,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../app/AuthContext'
import Button from '../components/ui/Button'
import RecordEngagementDrawer from '../components/engagement/RecordEngagementDrawer'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import type { Deal, DealOptions, DealPipeline, PipelineStage } from '../types/deal'

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500'

const pipelineKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  const step = 304

  if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
    event.preventDefault()
    return {
      ...currentCoordinates,
      x: currentCoordinates.x + (event.code === 'ArrowRight' ? step : -step),
    }
  }

  return undefined
}

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required.').max(255),
  pipeline_id: z.string().min(1),
  stage_id: z.string().min(1, 'Stage is required.'),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
  assigned_to: z.string().optional(),
  value: z.coerce.number().min(0, 'Value cannot be negative.'),
  currency: z.string().length(3),
  probability: z.coerce.number().int().min(0).max(100),
  expected_close_date: z.string().optional(),
  description: z.string().max(10000).optional(),
})

type DealFormInput = z.input<typeof dealSchema>
type DealFormValues = z.infer<typeof dealSchema>

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function DealCard({
  deal,
  overlay = false,
  onView,
}: {
  deal: Deal
  overlay?: boolean
  onView?: (deal: Deal) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { type: 'deal', deal },
    disabled: overlay,
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
        isDragging && 'opacity-30',
        overlay && 'w-72 rotate-1 shadow-xl',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Move ${deal.name}`}
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{deal.name}</h3>
          {deal.company && (
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
              <Building2 className="h-3.5 w-3.5" /> {deal.company.name}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-slate-800">{formatMoney(deal.value, deal.currency)}</span>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          {deal.probability}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex min-w-0 items-center gap-1">
          <UserRound className="h-3.5 w-3.5" />
          <span className="truncate">{deal.assignee?.name ?? 'Unassigned'}</span>
        </span>
        {deal.expected_close_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(`${deal.expected_close_date}T00:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
      {!overlay && onView && (
        <button
          type="button"
          onClick={() => onView(deal)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />
          View activity
        </button>
      )}
    </article>
  )
}

function StageColumn({
  stage,
  currency,
  onView,
}: {
  stage: PipelineStage
  currency: string
  onView: (deal: Deal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'stage', stage } })

  return (
    <section className="w-[292px] shrink-0" aria-labelledby={`stage-${stage.id}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color ?? '#64748b' }} />
          <h2 id={`stage-${stage.id}`} className="text-xs font-bold uppercase tracking-wide text-slate-700">
            {stage.name}
          </h2>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            {stage.deal_count}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {formatMoney(stage.total_value, currency)}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[24rem] space-y-2.5 rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 transition-colors',
          isOver && 'border-blue-400 bg-blue-50',
        )}
      >
        {stage.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onView={onView} />
        ))}
        {stage.deals.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
            Drop a deal here
          </div>
        )}
      </div>
    </section>
  )
}

function DealDialog({
  options,
  currency,
  onClose,
}: {
  options: DealOptions
  currency: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const defaultPipeline = options.pipelines.find((pipeline) => pipeline.is_default) ?? options.pipelines[0]
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DealFormInput, unknown, DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: '',
      pipeline_id: defaultPipeline?.id ?? '',
      stage_id: defaultPipeline?.stages[0]?.id ?? '',
      company_id: '',
      contact_id: '',
      assigned_to: '',
      value: 0,
      currency,
      probability: defaultPipeline?.stages[0]?.probability ?? 0,
      expected_close_date: '',
      description: '',
    },
  })
  const pipelineId = useWatch({ control, name: 'pipeline_id' })
  const selectedPipeline = options.pipelines.find((pipeline) => pipeline.id === pipelineId)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (values: DealFormValues) =>
      api.post(
        '/api/v1/deals',
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])),
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      onClose()
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data?.errors) {
        Object.entries(error.response.data.errors as Record<string, string[]>).forEach(([field, messages]) =>
          setError(field as keyof DealFormInput, { message: messages[0] }),
        )
      } else setError('root', { message: 'The deal could not be saved. Please try again.' })
    },
  })

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-dialog-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 id="deal-dialog-title" className="font-semibold text-slate-900">
              Add deal
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Add an opportunity to the sales pipeline.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close deal form" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form
          className="space-y-5 p-5"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          {errors.root && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deal name" error={errors.name?.message}>
              <input {...register('name')} className={fieldClass} autoFocus />
            </Field>
            <Field label="Value" error={errors.value?.message}>
              <input {...register('value')} type="number" min="0" step="0.01" className={fieldClass} />
            </Field>
            <Field label="Pipeline" error={errors.pipeline_id?.message}>
              <select
                {...register('pipeline_id')}
                className={fieldClass}
                onChange={(event) => {
                  const pipeline = options.pipelines.find((item) => item.id === event.target.value)
                  setValue('pipeline_id', event.target.value)
                  setValue('stage_id', pipeline?.stages[0]?.id ?? '')
                  setValue('probability', pipeline?.stages[0]?.probability ?? 0)
                }}
              >
                {options.pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage" error={errors.stage_id?.message}>
              <select
                {...register('stage_id')}
                className={fieldClass}
                onChange={(event) => {
                  const stage = selectedPipeline?.stages.find((item) => item.id === event.target.value)
                  setValue('stage_id', event.target.value)
                  setValue('probability', stage?.probability ?? 0)
                }}
              >
                {selectedPipeline?.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Company" error={errors.company_id?.message}>
              <select {...register('company_id')} className={fieldClass}>
                <option value="">No company</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contact" error={errors.contact_id?.message}>
              <select {...register('contact_id')} className={fieldClass}>
                <option value="">No contact</option>
                {options.contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee" error={errors.assigned_to?.message}>
              <select {...register('assigned_to')} className={fieldClass}>
                <option value="">Unassigned</option>
                {options.assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expected close" error={errors.expected_close_date?.message}>
              <input {...register('expected_close_date')} type="date" className={fieldClass} />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register('description')} rows={4} className={cn(fieldClass, 'h-auto py-2')} />
          </Field>
          <input {...register('currency')} type="hidden" />
          <input {...register('probability')} type="hidden" />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}Create deal
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default function PipelinePage() {
  const { currentOrganization } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detail, setDetail] = useState<Deal | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: pipelineKeyboardCoordinates }),
  )
  const pipeline = useQuery({
    queryKey: ['deal-pipeline', currentOrganization?.id],
    queryFn: async () => (await api.get<{ data: DealPipeline }>('/api/v1/deals/pipeline')).data.data,
    enabled: !!currentOrganization,
  })
  const options = useQuery({
    queryKey: ['deal-options', currentOrganization?.id],
    queryFn: async () => (await api.get<{ data: DealOptions }>('/api/v1/deals/options')).data.data,
    enabled: !!currentOrganization,
  })
  const dealsById = useMemo(
    () =>
      new Map(pipeline.data?.stages.flatMap((stage) => stage.deals.map((deal) => [deal.id, deal] as const))),
    [pipeline.data],
  )
  const move = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.patch(`/api/v1/deals/${dealId}/stage`, { stage_id: stageId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })

  const handleDragStart = (event: DragStartEvent) =>
    setActiveDeal(dealsById.get(String(event.active.id)) ?? null)
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null)
    if (!event.over) return
    const deal = dealsById.get(String(event.active.id))
    const stageId = String(event.over.id)
    if (deal && deal.stage.id !== stageId) move.mutate({ dealId: deal.id, stageId })
  }

  return (
    <div className="flex min-h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sales Pipeline</h1>
            <p className="mt-0.5 text-sm text-slate-500">Drag deals between stages as they progress.</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!options.data}>
            <Plus className="h-4 w-4" />
            Add Deal
          </Button>
        </div>
        {pipeline.data && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{pipeline.data.name}</span>
            <span>
              {pipeline.data.stages.reduce((total, stage) => total + stage.deal_count, 0)} open opportunities
            </span>
            <span className="flex items-center gap-1">
              <CircleDollarSign className="h-3.5 w-3.5" />
              {formatMoney(
                pipeline.data.stages.reduce((total, stage) => total + stage.total_value, 0),
                currentOrganization?.currency ?? 'USD',
              )}{' '}
              total value
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-x-auto p-4 sm:p-5">
        {pipeline.isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        {pipeline.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The sales pipeline could not be loaded.
          </div>
        )}
        {pipeline.data?.stages.length === 0 && (
          <EmptyState
            icon={CircleDollarSign}
            title="No pipeline stages"
            description="An administrator needs to configure at least one active pipeline stage."
          />
        )}
        {!!pipeline.data?.stages.length && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDeal(null)}
          >
            <div className="flex min-w-max gap-3 pb-4">
              {pipeline.data.stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  currency={currentOrganization?.currency ?? 'USD'}
                onView={(deal) => navigate(`/pipeline/deal/${deal.id}`)}
                />
              ))}
            </div>
            <DragOverlay>{activeDeal ? <DealCard deal={activeDeal} overlay /> : null}</DragOverlay>
          </DndContext>
        )}
        {move.isError && (
          <div
            role="alert"
            className="fixed bottom-5 right-5 z-50 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
          >
            The deal could not be moved.
          </div>
        )}
      </div>
      {dialogOpen && options.data && (
        <DealDialog
          options={options.data}
          currency={currentOrganization?.currency ?? 'USD'}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {detail && (
        <RecordEngagementDrawer
          type="deal"
          recordId={detail.id}
          title={detail.name}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
