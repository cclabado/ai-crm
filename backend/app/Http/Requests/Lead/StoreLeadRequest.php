<?php

namespace App\Http\Requests\Lead;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('leads.create') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['nullable', 'string', 'max:120'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'source_id' => ['nullable', 'string', 'size:26'],
            'status_id' => ['required', 'string', 'size:26'],
            'assigned_to' => ['nullable', 'string', 'size:26'],
            'priority' => ['required', 'in:low,medium,high,critical'],
            'score' => ['nullable', 'integer', 'between:0,100'],
            'estimated_value' => ['nullable', 'numeric', 'min:0', 'max:99999999999999'],
            'currency' => ['required', 'string', 'size:3'],
            'description' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
