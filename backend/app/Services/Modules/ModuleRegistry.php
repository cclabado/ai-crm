<?php

namespace App\Services\Modules;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\SupportTicket;
use App\Models\Task;
use InvalidArgumentException;

final class ModuleRegistry
{
    public function get(string $module): array
    {
        $configuration = match ($module) {
            'companies' => [Company::class, 'companies', ['name', 'legal_name', 'industry', 'website', 'email', 'phone', 'status', 'tax_id', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country_code', 'annual_revenue', 'employee_count', 'description'], ['name', 'industry', 'email'], ['name' => 'required|string|max:255', 'email' => 'nullable|email|max:255', 'website' => 'nullable|url|max:255', 'status' => 'nullable|in:prospect,customer,inactive', 'country_code' => 'nullable|string|size:2', 'annual_revenue' => 'nullable|numeric|min:0', 'employee_count' => 'nullable|integer|min:0']],
            'contacts' => [Contact::class, 'contacts', ['first_name', 'last_name', 'job_title', 'email', 'phone', 'mobile', 'status', 'preferred_channel', 'description'], ['first_name', 'last_name', 'email'], ['first_name' => 'required|string|max:120', 'last_name' => 'nullable|string|max:120', 'email' => 'nullable|email|max:255', 'status' => 'nullable|in:active,inactive', 'preferred_channel' => 'nullable|in:email,phone,mobile']],
            'tasks' => [Task::class, 'tasks', ['type', 'title', 'description', 'priority', 'status', 'starts_at', 'due_at', 'completed_at'], ['title', 'description'], ['title' => 'required|string|max:255', 'type' => 'nullable|in:task,call,meeting,follow_up', 'priority' => 'nullable|in:low,medium,high,critical', 'status' => 'nullable|in:todo,in_progress,completed,cancelled', 'starts_at' => 'nullable|date', 'due_at' => 'nullable|date', 'completed_at' => 'nullable|date']],
            'products' => [Product::class, 'products', ['type', 'sku', 'name', 'description', 'unit_price', 'currency', 'default_tax_rate', 'is_active'], ['name', 'sku', 'description'], ['name' => 'required|string|max:255', 'type' => 'nullable|in:product,service', 'sku' => 'nullable|string|max:120', 'unit_price' => 'required|numeric|min:0', 'currency' => 'required|string|size:3', 'default_tax_rate' => 'nullable|numeric|between:0,100', 'is_active' => 'boolean']],
            'quotations' => [Quotation::class, 'quotations', ['number', 'status', 'currency', 'issued_at', 'expires_at', 'terms', 'notes'], ['number', 'notes'], ['number' => 'nullable|string|max:80', 'status' => 'nullable|in:draft,sent,accepted,rejected,expired', 'currency' => 'required|string|size:3', 'issued_at' => 'nullable|date', 'expires_at' => 'nullable|date|after_or_equal:issued_at', 'items' => 'required|array|min:1', 'items.*.name' => 'required|string|max:255', 'items.*.quantity' => 'required|numeric|min:0.001', 'items.*.unit_price' => 'required|numeric|min:0', 'items.*.discount_rate' => 'nullable|numeric|between:0,100', 'items.*.tax_rate' => 'nullable|numeric|between:0,100']],
            'invoices' => [Invoice::class, 'invoices', ['number', 'status', 'currency', 'issued_at', 'due_at', 'terms', 'amount_paid', 'paid_at'], ['number'], ['number' => 'nullable|string|max:80', 'status' => 'nullable|in:draft,sent,partial,paid,overdue,void', 'currency' => 'required|string|size:3', 'issued_at' => 'nullable|date', 'due_at' => 'nullable|date|after_or_equal:issued_at', 'amount_paid' => 'nullable|numeric|min:0', 'items' => 'required|array|min:1', 'items.*.name' => 'required|string|max:255', 'items.*.quantity' => 'required|numeric|min:0.001', 'items.*.unit_price' => 'required|numeric|min:0', 'items.*.discount_amount' => 'nullable|numeric|min:0', 'items.*.tax_amount' => 'nullable|numeric|min:0']],
            'tickets' => [SupportTicket::class, 'tickets', ['number', 'subject', 'category', 'priority', 'status', 'sla_due_at', 'satisfaction_rating'], ['number', 'subject', 'category'], ['number' => 'nullable|string|max:80', 'subject' => 'required|string|max:255', 'category' => 'nullable|string|max:120', 'priority' => 'nullable|in:low,medium,high,critical', 'status' => 'nullable|in:open,pending,resolved,closed', 'sla_due_at' => 'nullable|date', 'satisfaction_rating' => 'nullable|integer|between:1,5']],
            'documents' => [Document::class, 'documents', ['parent_id', 'type', 'name', 'disk', 'path', 'mime_type', 'size', 'version'], ['name'], ['name' => 'required|string|max:255', 'type' => 'nullable|in:file,folder', 'path' => 'nullable|string|max:2048', 'mime_type' => 'nullable|string|max:120', 'size' => 'nullable|integer|min:0']],
            default => throw new InvalidArgumentException('Unknown module.'),
        };

        return array_combine(['model', 'permission', 'fields', 'search', 'rules'], $configuration);
    }
}
