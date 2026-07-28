<?php

namespace App\Services\Leads;

use App\Models\Activity;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\User;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class LeadService
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $allowedSorts = ['created_at', 'updated_at', 'estimated_value', 'score', 'first_name', 'last_contacted_at'];
        $sort = in_array($filters['sort'] ?? null, $allowedSorts, true) ? $filters['sort'] : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);

        return Lead::query()
            ->with(['source', 'status', 'assignee'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('public_id', $status)))
            ->when($filters['source'] ?? null, fn (Builder $query, string $source) => $query->whereHas('source', fn (Builder $sourceQuery) => $sourceQuery->where('public_id', $source)))
            ->when($filters['priority'] ?? null, fn (Builder $query, string $priority) => $query->where('priority', $priority))
            ->when($filters['assigned_to'] ?? null, fn (Builder $query, string $assignee) => $query->whereHas('assignee', fn (Builder $userQuery) => $userQuery->where('public_id', $assignee)))
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function find(string $publicId, bool $withTrashed = false): Lead
    {
        return Lead::query()
            ->when($withTrashed, fn (Builder $query) => $query->withTrashed())
            ->with(['source', 'status', 'assignee', 'owner'])
            ->where('public_id', $publicId)
            ->firstOrFail();
    }

    public function create(array $data, User $actor): Lead
    {
        return DB::transaction(function () use ($data, $actor): Lead {
            $lead = Lead::query()->create([
                ...$this->attributes($data),
                'owner_id' => $actor->getKey(),
            ]);

            $this->recordActivity($lead, $actor, 'lead.created', 'Lead created');

            return $lead->load(['source', 'status', 'assignee', 'owner']);
        });
    }

    public function update(Lead $lead, array $data, User $actor): Lead
    {
        return DB::transaction(function () use ($lead, $data, $actor): Lead {
            $before = $lead->only(['lead_status_id', 'assigned_to', 'priority', 'estimated_value']);
            $lead->update($this->attributes($data, true));
            $changes = array_intersect_key($lead->getChanges(), $before);

            $this->recordActivity($lead, $actor, 'lead.updated', 'Lead updated', [
                'before' => Arr::only($before, array_keys($changes)),
                'after' => $changes,
            ]);

            return $lead->refresh()->load(['source', 'status', 'assignee', 'owner']);
        });
    }

    public function archive(Lead $lead, User $actor): void
    {
        DB::transaction(function () use ($lead, $actor): void {
            $this->recordActivity($lead, $actor, 'lead.archived', 'Lead archived');
            $lead->delete();
        });
    }

    public function restore(Lead $lead, User $actor): Lead
    {
        $lead->restore();
        $this->recordActivity($lead, $actor, 'lead.restored', 'Lead restored');

        return $lead->load(['source', 'status', 'assignee', 'owner']);
    }

    public function bulkUpdate(array $data, User $actor): int
    {
        return DB::transaction(function () use ($data, $actor): int {
            $attributes = [];
            if (array_key_exists('status_id', $data)) {
                $attributes['lead_status_id'] = $this->resolveStatusId($data['status_id']);
            }
            if (array_key_exists('assigned_to', $data)) {
                $attributes['assigned_to'] = $this->resolveAssigneeId($data['assigned_to']);
            }

            $leads = Lead::query()->whereIn('public_id', $data['lead_ids'])->get();
            if ($leads->count() !== count($data['lead_ids'])) {
                throw ValidationException::withMessages(['lead_ids' => ['One or more leads are invalid.']]);
            }

            foreach ($leads as $lead) {
                $lead->update($attributes);
                $this->recordActivity($lead, $actor, 'lead.bulk_updated', 'Lead updated in bulk');
            }

            return $leads->count();
        });
    }

    private function attributes(array $data, bool $partial = false): array
    {
        $attributes = Arr::only($data, [
            'first_name', 'last_name', 'company_name', 'job_title', 'email', 'phone',
            'priority', 'score', 'estimated_value', 'currency', 'description',
        ]);

        if (! $partial || array_key_exists('source_id', $data)) {
            $attributes['lead_source_id'] = $this->resolveSourceId($data['source_id'] ?? null);
        }
        if (! $partial || array_key_exists('status_id', $data)) {
            $attributes['lead_status_id'] = $this->resolveStatusId($data['status_id'] ?? null);
        }
        if (! $partial || array_key_exists('assigned_to', $data)) {
            $attributes['assigned_to'] = $this->resolveAssigneeId($data['assigned_to'] ?? null);
        }

        return $attributes;
    }

    private function resolveSourceId(?string $publicId): ?int
    {
        if ($publicId === null) {
            return null;
        }

        return LeadSource::query()->where('public_id', $publicId)->value('id')
            ?? throw ValidationException::withMessages(['source_id' => ['The selected lead source is invalid.']]);
    }

    private function resolveStatusId(?string $publicId): int
    {
        return LeadStatus::query()->where('public_id', $publicId)->value('id')
            ?? throw ValidationException::withMessages(['status_id' => ['The selected lead status is invalid.']]);
    }

    private function resolveAssigneeId(?string $publicId): ?int
    {
        if ($publicId === null) {
            return null;
        }

        return $this->currentOrganization->get()?->users()
            ->wherePivot('status', 'active')
            ->where('users.public_id', $publicId)
            ->value('users.id')
            ?? throw ValidationException::withMessages(['assigned_to' => ['The selected assignee is invalid.']]);
    }

    private function recordActivity(Lead $lead, User $actor, string $type, string $title, array $metadata = []): void
    {
        Activity::query()->create([
            'actor_id' => $actor->getKey(),
            'subject_type' => Lead::class,
            'subject_id' => $lead->getKey(),
            'type' => $type,
            'title' => $title,
            'occurred_at' => now(),
            'metadata' => $metadata,
        ]);
    }
}
