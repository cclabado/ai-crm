<?php

namespace App\Services\Deals;

use App\Http\Resources\DealResource;
use App\Models\Activity;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DealService
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        return Deal::query()->with(['pipeline', 'stage', 'company', 'contact', 'assignee'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($filters['stage'] ?? null, fn (Builder $query, string $stage) => $query->whereHas('stage', fn (Builder $stageQuery) => $stageQuery->where('public_id', $stage)))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->latest()->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 100));
    }

    public function pipeline(?string $pipelinePublicId = null): array
    {
        $pipeline = Pipeline::query()
            ->when($pipelinePublicId, fn (Builder $query, string $id) => $query->where('public_id', $id))
            ->when(! $pipelinePublicId, fn (Builder $query) => $query->where('is_default', true))
            ->with(['stages' => fn ($query) => $query->where('is_active', true)->with(['deals' => fn ($dealQuery) => $dealQuery->with(['company', 'contact', 'assignee'])->orderByDesc('value')])])
            ->firstOrFail();

        return [
            'id' => $pipeline->public_id,
            'name' => $pipeline->name,
            'stages' => $pipeline->stages->map(fn (PipelineStage $stage) => [
                'id' => $stage->public_id,
                'name' => $stage->name,
                'color' => $stage->color,
                'probability' => $stage->probability,
                'semantic_type' => $stage->semantic_type,
                'position' => $stage->position,
                'deal_count' => $stage->deals->count(),
                'total_value' => (float) $stage->deals->sum('value'),
                'deals' => $stage->deals->map(fn (Deal $deal) => new DealResource($deal->setRelation('stage', $stage)->setRelation('pipeline', $pipeline))),
            ]),
        ];
    }

    public function find(string $publicId): Deal
    {
        return Deal::query()->with(['pipeline', 'stage', 'company', 'contact', 'assignee'])->where('public_id', $publicId)->firstOrFail();
    }

    public function create(array $data, User $actor): Deal
    {
        return DB::transaction(function () use ($data, $actor): Deal {
            [$pipeline, $stage] = $this->resolvePipelineStage($data['pipeline_id'], $data['stage_id']);
            $deal = Deal::query()->create([
                ...$this->attributes($data),
                'pipeline_id' => $pipeline->getKey(),
                'pipeline_stage_id' => $stage->getKey(),
                'status' => $this->statusForStage($stage),
                'actual_close_date' => $stage->semantic_type === 'open' ? null : now()->toDateString(),
            ]);
            $this->recordMove($deal, null, $stage, $actor, 'Deal created');

            return $this->find($deal->public_id);
        });
    }

    public function update(Deal $deal, array $data): Deal
    {
        $deal->update($this->attributes($data, true));

        return $this->find($deal->public_id);
    }

    public function move(Deal $deal, string $stagePublicId, User $actor, ?string $reason = null): Deal
    {
        $stage = PipelineStage::query()
            ->where('pipeline_id', $deal->pipeline_id)
            ->where('public_id', $stagePublicId)
            ->first();
        if (! $stage) {
            throw ValidationException::withMessages(['stage_id' => ['The selected stage is invalid for this pipeline.']]);
        }

        if ($deal->pipeline_stage_id === $stage->getKey()) {
            return $deal;
        }

        return DB::transaction(function () use ($deal, $stage, $actor, $reason): Deal {
            $fromStage = $deal->stage;
            $deal->update([
                'pipeline_stage_id' => $stage->getKey(),
                'probability' => $stage->probability,
                'status' => $this->statusForStage($stage),
                'actual_close_date' => $stage->semantic_type === 'open' ? null : now()->toDateString(),
            ]);
            $this->recordMove($deal, $fromStage, $stage, $actor, $reason);

            return $this->find($deal->public_id);
        });
    }

    public function delete(Deal $deal): void
    {
        $deal->delete();
    }

    private function attributes(array $data, bool $partial = false): array
    {
        $attributes = Arr::only($data, ['name', 'value', 'currency', 'probability', 'expected_close_date', 'description', 'loss_reason']);
        foreach (['company_id' => Company::class, 'contact_id' => Contact::class] as $key => $model) {
            if (! $partial || array_key_exists($key, $data)) {
                $attributes[$key] = ($data[$key] ?? null) ? $model::query()->where('public_id', $data[$key])->value('id') : null;
                if (($data[$key] ?? null) && ! $attributes[$key]) {
                    throw ValidationException::withMessages([$key => ['The selected record is invalid.']]);
                }
            }
        }
        if (! $partial || array_key_exists('assigned_to', $data)) {
            $attributes['assigned_to'] = ($data['assigned_to'] ?? null) ? $this->currentOrganization->get()?->users()->wherePivot('status', 'active')->where('users.public_id', $data['assigned_to'])->value('users.id') : null;
            if (($data['assigned_to'] ?? null) && ! $attributes['assigned_to']) {
                throw ValidationException::withMessages(['assigned_to' => ['The selected assignee is invalid.']]);
            }
        }

        return $attributes;
    }

    private function resolvePipelineStage(string $pipelineId, string $stageId): array
    {
        $pipeline = Pipeline::query()->where('public_id', $pipelineId)->first();
        $stage = $pipeline?->stages()->where('public_id', $stageId)->first();
        if (! $pipeline || ! $stage) {
            throw ValidationException::withMessages(['stage_id' => ['The selected pipeline stage is invalid.']]);
        }

        return [$pipeline, $stage];
    }

    private function statusForStage(PipelineStage $stage): string
    {
        return match ($stage->semantic_type) {
            'won' => 'won', 'lost' => 'lost', default => 'open'
        };
    }

    private function recordMove(Deal $deal, ?PipelineStage $from, PipelineStage $to, User $actor, ?string $reason): void
    {
        DB::table('deal_stage_history')->insert([
            'deal_id' => $deal->getKey(), 'from_stage_id' => $from?->getKey(), 'to_stage_id' => $to->getKey(),
            'changed_by' => $actor->getKey(), 'reason' => $reason, 'changed_at' => now(),
        ]);
        Activity::query()->create([
            'actor_id' => $actor->getKey(), 'subject_type' => Deal::class, 'subject_id' => $deal->getKey(),
            'type' => 'deal.stage_moved', 'title' => "Deal moved to {$to->name}", 'description' => $reason,
            'occurred_at' => now(), 'metadata' => ['from' => $from?->name, 'to' => $to->name],
        ]);
    }
}
