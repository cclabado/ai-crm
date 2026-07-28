<?php

namespace App\Http\Requests\Lead;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('leads.update') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:120'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:160'],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'source_id' => ['sometimes', 'nullable', 'string', 'size:26'],
            'status_id' => ['sometimes', 'required', 'string', 'size:26'],
            'assigned_to' => ['sometimes', 'nullable', 'string', 'size:26'],
            'priority' => ['sometimes', 'required', 'in:low,medium,high,critical'],
            'score' => ['sometimes', 'nullable', 'integer', 'between:0,100'],
            'estimated_value' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999999999'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ];
    }
}
