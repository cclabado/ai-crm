<?php

namespace App\Http\Requests\Deal;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDealRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('deals.update') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'company_id' => ['sometimes', 'nullable', 'string', 'size:26'],
            'contact_id' => ['sometimes', 'nullable', 'string', 'size:26'],
            'assigned_to' => ['sometimes', 'nullable', 'string', 'size:26'],
            'value' => ['sometimes', 'required', 'numeric', 'min:0', 'max:99999999999999'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'probability' => ['sometimes', 'required', 'integer', 'between:0,100'],
            'expected_close_date' => ['sometimes', 'nullable', 'date'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'loss_reason' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
