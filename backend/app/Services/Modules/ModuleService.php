<?php

namespace App\Services\Modules;

use App\Models\Invoice;
use App\Models\Quotation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final class ModuleService
{
    public function __construct(private readonly ModuleRegistry $registry) {}

    public function paginate(string $module, array $filters): LengthAwarePaginator
    {
        $config = $this->registry->get($module);
        $model = $config['model'];

        return $model::query()
            ->when(in_array($module, ['quotations', 'invoices'], true), fn ($query) => $query->with('items'))
            ->when($filters['search'] ?? null, function ($query, string $search) use ($config): void {
                $query->where(function ($nested) use ($config, $search): void {
                    foreach ($config['search'] as $index => $field) {
                        $index === 0 ? $nested->where($field, 'like', "%{$search}%") : $nested->orWhere($field, 'like', "%{$search}%");
                    }
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($module === 'tasks' && ($filters['date_from'] ?? null), fn ($query) => $query->where('due_at', '>=', $filters['date_from']))
            ->when($module === 'tasks' && ($filters['date_to'] ?? null), fn ($query) => $query->where('due_at', '<=', $filters['date_to']))
            ->latest()->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 100));
    }

    public function find(string $module, string $publicId): Model
    {
        $config = $this->registry->get($module);
        $model = $config['model'];

        return $model::query()->when(in_array($module, ['quotations', 'invoices'], true), fn ($query) => $query->with('items'))->where('public_id', $publicId)->firstOrFail();
    }

    public function save(string $module, array $data, ?Model $record, int $userId): Model
    {
        $config = $this->registry->get($module);
        $model = $config['model'];

        return DB::transaction(function () use ($module, $data, $record, $userId, $config, $model): Model {
            $attributes = Arr::only($data, $config['fields']);
            if (! $record) {
                $attributes += match ($module) {
                    'tasks' => ['created_by' => $userId],
                    'quotations', 'invoices' => ['created_by' => $userId],
                    'tickets' => ['created_by' => $userId],
                    'documents' => ['uploaded_by' => $userId],
                    default => [],
                };
                if (in_array($module, ['quotations', 'invoices', 'tickets'], true) && empty($attributes['number'])) {
                    $attributes['number'] = $this->nextNumber($module, $model);
                }
                $record = $model::query()->create($attributes);
            } else {
                $record->update($attributes);
            }

            if ($record instanceof Quotation || $record instanceof Invoice) {
                $this->syncItems($record, $data['items'] ?? []);
            }

            return $this->find($module, $record->public_id);
        });
    }

    public function delete(Model $record): void
    {
        $record->delete();
    }

    private function nextNumber(string $module, string $model): string
    {
        $prefix = ['quotations' => 'Q', 'invoices' => 'INV', 'tickets' => 'TKT'][$module];

        return sprintf('%s-%s-%04d', $prefix, now()->format('Y'), $model::query()->withTrashed()->count() + 1);
    }

    private function syncItems(Quotation|Invoice $record, array $items): void
    {
        $record->items()->delete();
        $subtotal = $discountTotal = $taxTotal = 0.0;
        foreach ($items as $position => $item) {
            $quantity = (float) $item['quantity'];
            $unitPrice = (float) $item['unit_price'];
            $gross = $quantity * $unitPrice;
            $discount = $record instanceof Quotation ? $gross * ((float) ($item['discount_rate'] ?? 0) / 100) : (float) ($item['discount_amount'] ?? 0);
            $tax = $record instanceof Quotation ? ($gross - $discount) * ((float) ($item['tax_rate'] ?? 0) / 100) : (float) ($item['tax_amount'] ?? 0);
            $record->items()->create([...$item, 'discount_amount' => $discount, 'tax_amount' => $tax, 'line_total' => $gross - $discount + $tax, 'position' => $position]);
            $subtotal += $gross;
            $discountTotal += $discount;
            $taxTotal += $tax;
        }
        $record->update(['subtotal' => $subtotal, 'discount_total' => $discountTotal, 'tax_total' => $taxTotal, 'total' => $subtotal - $discountTotal + $taxTotal]);
    }
}
