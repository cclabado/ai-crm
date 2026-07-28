<?php

namespace App\Http\Requests\Deal;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDealRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('deals.create') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'pipeline_id' => ['required', 'string', 'size:26'],
            'stage_id' => ['required', 'string', 'size:26'],
            'company_id' => ['nullable', 'string', 'size:26'],
            'contact_id' => ['nullable', 'string', 'size:26'],
            'assigned_to' => ['nullable', 'string', 'size:26'],
            'value' => ['required', 'numeric', 'min:0', 'max:99999999999999'],
            'currency' => ['required', 'string', 'size:3'],
            'probability' => ['required', 'integer', 'between:0,100'],
            'expected_close_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
