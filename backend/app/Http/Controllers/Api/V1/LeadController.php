<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\BulkUpdateLeadsRequest;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Http\Requests\Lead\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Services\Leads\LeadService;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class LeadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, LeadService $leads): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        return LeadResource::collection($leads->paginate($request->only([
            'search', 'status', 'source', 'priority', 'assigned_to', 'sort', 'direction', 'per_page',
        ])));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreLeadRequest $request, LeadService $leads): JsonResponse
    {
        $lead = $leads->create($request->validated(), $request->user());

        return response()->json([
            'data' => new LeadResource($lead),
            'message' => 'Lead created successfully.',
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $lead, LeadService $leads): LeadResource
    {
        $record = $leads->find($lead);
        $this->authorize('view', $record);

        return new LeadResource($record);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateLeadRequest $request, string $lead, LeadService $leads): LeadResource
    {
        $record = $leads->find($lead);
        $this->authorize('update', $record);

        return new LeadResource($leads->update($record, $request->validated(), $request->user()));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $lead, LeadService $leads): Response
    {
        $record = $leads->find($lead);
        $this->authorize('delete', $record);
        $leads->archive($record, $request->user());

        return response()->noContent();
    }

    public function restore(Request $request, string $lead, LeadService $leads): LeadResource
    {
        $record = $leads->find($lead, true);
        $this->authorize('restore', $record);

        return new LeadResource($leads->restore($record, $request->user()));
    }

    public function bulkUpdate(BulkUpdateLeadsRequest $request, LeadService $leads): JsonResponse
    {
        $updated = $leads->bulkUpdate($request->validated(), $request->user());

        return response()->json(['data' => ['updated' => $updated], 'message' => 'Leads updated successfully.']);
    }

    public function options(CurrentOrganization $currentOrganization): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        return response()->json(['data' => [
            'sources' => LeadSource::query()->where('is_active', true)->orderBy('position')->get(['public_id as id', 'name', 'color']),
            'statuses' => LeadStatus::query()->where('is_active', true)->orderBy('position')->get(['public_id as id', 'name', 'color', 'semantic_type']),
            'assignees' => $currentOrganization->get()?->users()->wherePivot('status', 'active')->orderBy('name')->get(['users.public_id as id', 'name', 'email']) ?? [],
        ]]);
    }
}
