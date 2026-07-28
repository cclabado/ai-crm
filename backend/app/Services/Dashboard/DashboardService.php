<?php

namespace App\Services\Dashboard;

use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Support\Facades\DB;

final class DashboardService
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    public function summary(): array
    {
        $organizationId = $this->currentOrganization->id();
        $today = now()->toDateString();

        $dealTotals = DB::table('deals')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->selectRaw("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS active_deals")
            ->selectRaw("SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won_deals")
            ->selectRaw("SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost_deals")
            ->selectRaw("SUM(CASE WHEN status = 'won' THEN value ELSE 0 END) AS won_value")
            ->first();

        $leadTotals = DB::table('leads')
            ->leftJoin('lead_statuses', 'lead_statuses.id', '=', 'leads.lead_status_id')
            ->where('leads.organization_id', $organizationId)
            ->whereNull('leads.deleted_at')
            ->selectRaw('COUNT(*) AS total_leads')
            ->selectRaw("SUM(CASE WHEN lead_statuses.key = 'new' THEN 1 ELSE 0 END) AS new_leads")
            ->selectRaw("SUM(CASE WHEN lead_statuses.key = 'qualified' THEN 1 ELSE 0 END) AS qualified_leads")
            ->first();

        $wonDeals = (int) ($dealTotals->won_deals ?? 0);
        $lostDeals = (int) ($dealTotals->lost_deals ?? 0);
        $closedDeals = $wonDeals + $lostDeals;

        return [
            'metrics' => [
                'total_leads' => (int) ($leadTotals->total_leads ?? 0),
                'new_leads' => (int) ($leadTotals->new_leads ?? 0),
                'qualified_leads' => (int) ($leadTotals->qualified_leads ?? 0),
                'active_deals' => (int) ($dealTotals->active_deals ?? 0),
                'won_deals' => $wonDeals,
                'lost_deals' => $lostDeals,
                'sales_value' => (float) ($dealTotals->won_value ?? 0),
                'conversion_rate' => $closedDeals > 0 ? round(($wonDeals / $closedDeals) * 100, 1) : 0,
                'tasks_due_today' => DB::table('tasks')->where('organization_id', $organizationId)->whereDate('due_at', $today)->whereNull('completed_at')->whereNull('deleted_at')->count(),
                'overdue_tasks' => DB::table('tasks')->where('organization_id', $organizationId)->where('due_at', '<', now())->whereNull('completed_at')->whereNull('deleted_at')->count(),
            ],
            'recent_activities' => DB::table('activities')
                ->where('organization_id', $organizationId)
                ->latest('occurred_at')
                ->limit(8)
                ->get(['public_id as id', 'type', 'title', 'description', 'occurred_at'])
                ->map(fn ($activity) => (array) $activity),
            'charts' => [
                'pipeline' => DB::table('deals')->join('pipeline_stages', 'pipeline_stages.id', '=', 'deals.pipeline_stage_id')->where('deals.organization_id', $organizationId)->whereNull('deals.deleted_at')->groupBy('pipeline_stages.id', 'pipeline_stages.name', 'pipeline_stages.position')->orderBy('pipeline_stages.position')->get(['pipeline_stages.name as label', DB::raw('COUNT(deals.id) as total'), DB::raw('SUM(deals.value) as value')])->map(fn ($row) => ['label' => $row->label, 'total' => (int) $row->total, 'value' => (float) $row->value]),
                'lead_sources' => DB::table('leads')->leftJoin('lead_sources', 'lead_sources.id', '=', 'leads.lead_source_id')->where('leads.organization_id', $organizationId)->whereNull('leads.deleted_at')->groupBy('lead_sources.id', 'lead_sources.name')->get([DB::raw("COALESCE(lead_sources.name, 'Unknown') as label"), DB::raw('COUNT(leads.id) as value')])->map(fn ($row) => ['label' => $row->label, 'value' => (int) $row->value]),
                'monthly_sales' => DB::table('deals')->where('organization_id', $organizationId)->where('status', 'won')->whereNull('deleted_at')->whereNotNull('actual_close_date')->where('actual_close_date', '>=', now()->subMonths(11)->startOfMonth())->selectRaw("DATE_FORMAT(actual_close_date, '%Y-%m') as label, SUM(value) as value")->groupBy(DB::raw("DATE_FORMAT(actual_close_date, '%Y-%m')"))->orderBy('label')->get()->map(fn ($row) => ['label' => $row->label, 'value' => (float) $row->value]),
            ],
        ];
    }
}
