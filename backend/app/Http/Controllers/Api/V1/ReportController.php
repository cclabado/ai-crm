<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);
        $range = $request->validate(['date_from' => 'nullable|date', 'date_to' => 'nullable|date|after_or_equal:date_from']);
        $from = $range['date_from'] ?? null;
        $to = $range['date_to'] ?? null;
        $leadDate = fn ($query) => $query->when($from, fn ($q) => $q->whereDate('leads.created_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('leads.created_at', '<=', $to));
        $dealDate = fn ($query) => $query->when($from, fn ($q) => $q->whereDate('deals.created_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('deals.created_at', '<=', $to));
        $taskDate = fn ($query) => $query->when($from, fn ($q) => $q->whereDate('tasks.due_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('tasks.due_at', '<=', $to));

        return response()->json(['data' => [
            'leads_by_status' => $leadDate(Lead::query())->leftJoin('lead_statuses', 'lead_statuses.id', '=', 'leads.lead_status_id')->selectRaw("COALESCE(lead_statuses.name, 'Unassigned') label, COUNT(*) total")->groupBy('lead_statuses.name')->get(),
            'leads_by_source' => $leadDate(Lead::query())->leftJoin('lead_sources', 'lead_sources.id', '=', 'leads.lead_source_id')->selectRaw("COALESCE(lead_sources.name, 'Unknown') label, COUNT(*) total")->groupBy('lead_sources.name')->get(),
            'pipeline' => $dealDate(Deal::query())->join('pipeline_stages', 'pipeline_stages.id', '=', 'deals.pipeline_stage_id')->selectRaw('pipeline_stages.name label, COUNT(*) total, SUM(deals.value) value')->groupBy('pipeline_stages.id', 'pipeline_stages.name', 'pipeline_stages.position')->orderBy('pipeline_stages.position')->get(),
            'monthly_sales' => $dealDate(Deal::query())->where('status', 'won')->whereNotNull('actual_close_date')->selectRaw("DATE_FORMAT(actual_close_date, '%Y-%m') label, SUM(value) value")->groupBy(DB::raw("DATE_FORMAT(actual_close_date, '%Y-%m')"))->orderBy('label')->get(),
            'tasks' => ['total' => $taskDate(Task::query())->count(), 'completed' => $taskDate(Task::query())->where('status', 'completed')->count(), 'overdue' => $taskDate(Task::query())->whereNot('status', 'completed')->where('due_at', '<', now())->count()],
        ]]);
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('reports.export'), 403);
        $filters = $request->validate(['type' => 'required|in:leads,deals,tasks', 'date_from' => 'nullable|date', 'date_to' => 'nullable|date|after_or_equal:date_from']);
        $from = $filters['date_from'] ?? null;
        $to = $filters['date_to'] ?? null;
        $rows = match ($filters['type']) {
            'leads' => Lead::query()->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))->get(['public_id', 'first_name', 'last_name', 'email', 'priority', 'estimated_value', 'created_at']),
            'deals' => Deal::query()->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))->get(['public_id', 'name', 'value', 'currency', 'probability', 'status', 'expected_close_date']),
            'tasks' => Task::query()->when($from, fn ($q) => $q->whereDate('due_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('due_at', '<=', $to))->get(['public_id', 'title', 'type', 'priority', 'status', 'due_at']),
        };

        return response()->streamDownload(function () use ($rows): void {
            $output = fopen('php://output', 'w');
            if ($rows->isNotEmpty()) {
                fputcsv($output, array_keys($rows->first()->toArray()));
                foreach ($rows as $row) {
                    fputcsv($output, $row->toArray());
                }
            }
            fclose($output);
        }, "{$filters['type']}-report.csv", ['Content-Type' => 'text/csv']);
    }
}
