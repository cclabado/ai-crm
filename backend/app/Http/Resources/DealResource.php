<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DealResource extends JsonResource
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
            'name' => $this->name,
            'value' => (float) $this->value,
            'currency' => $this->currency,
            'probability' => $this->probability,
            'status' => $this->status,
            'expected_close_date' => $this->expected_close_date?->toDateString(),
            'actual_close_date' => $this->actual_close_date?->toDateString(),
            'description' => $this->description,
            'loss_reason' => $this->loss_reason,
            'pipeline' => $this->whenLoaded('pipeline', fn () => ['id' => $this->pipeline->public_id, 'name' => $this->pipeline->name]),
            'stage' => $this->whenLoaded('stage', fn () => ['id' => $this->stage->public_id, 'name' => $this->stage->name, 'color' => $this->stage->color, 'semantic_type' => $this->stage->semantic_type]),
            'company' => $this->whenLoaded('company', fn () => $this->company ? ['id' => $this->company->public_id, 'name' => $this->company->name] : null),
            'contact' => $this->whenLoaded('contact', fn () => $this->contact ? ['id' => $this->contact->public_id, 'name' => trim($this->contact->first_name.' '.$this->contact->last_name)] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->public_id, 'name' => $this->assignee->name] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
