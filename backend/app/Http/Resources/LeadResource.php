<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => trim($this->first_name.' '.$this->last_name),
            'company_name' => $this->company_name,
            'job_title' => $this->job_title,
            'email' => $this->email,
            'phone' => $this->phone,
            'priority' => $this->priority,
            'score' => $this->score,
            'estimated_value' => (float) $this->estimated_value,
            'currency' => $this->currency,
            'description' => $this->description,
            'source' => $this->whenLoaded('source', fn () => $this->source ? ['id' => $this->source->public_id, 'name' => $this->source->name, 'color' => $this->source->color] : null),
            'status' => $this->whenLoaded('status', fn () => $this->status ? ['id' => $this->status->public_id, 'name' => $this->status->name, 'color' => $this->status->color, 'semantic_type' => $this->status->semantic_type] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->public_id, 'name' => $this->assignee->name] : null),
            'last_contacted_at' => $this->last_contacted_at?->toIso8601String(),
            'converted_at' => $this->converted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
