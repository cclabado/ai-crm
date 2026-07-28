<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Deal\MoveDealRequest;
use App\Http\Requests\Deal\StoreDealRequest;
use App\Http\Requests\Deal\UpdateDealRequest;
use App\Http\Resources\DealResource;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Services\Deals\DealService;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class DealController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, DealService $deals): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Deal::class);

        return DealResource::collection($deals->paginate($request->only([
            'search', 'stage', 'status', 'per_page',
        ])));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreDealRequest $request, DealService $deals): JsonResponse
    {
        $deal = $deals->create($request->validated(), $request->user());

        return response()->json([
            'data' => new DealResource($deal),
            'message' => 'Deal created successfully.',
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $deal, DealService $deals): DealResource
    {
        $record = $deals->find($deal);
        $this->authorize('view', $record);

        return new DealResource($record);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateDealRequest $request, string $deal, DealService $deals): DealResource
    {
        $record = $deals->find($deal);
        $this->authorize('update', $record);

        return new DealResource($deals->update($record, $request->validated()));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $deal, DealService $deals): Response
    {
        $record = $deals->find($deal);
        $this->authorize('delete', $record);
        $deals->delete($record);

        return response()->noContent();
    }

    public function pipeline(Request $request, DealService $deals): JsonResponse
    {
        $this->authorize('viewAny', Deal::class);

        return response()->json(['data' => $deals->pipeline($request->string('pipeline')->toString() ?: null)]);
    }

    public function move(MoveDealRequest $request, string $deal, DealService $deals): DealResource
    {
        $record = $deals->find($deal);
        $this->authorize('update', $record);

        return new DealResource($deals->move(
            $record,
            $request->validated('stage_id'),
            $request->user(),
            $request->validated('reason'),
        ));
    }

    public function options(CurrentOrganization $currentOrganization): JsonResponse
    {
        $this->authorize('viewAny', Deal::class);

        return response()->json(['data' => [
            'pipelines' => Pipeline::query()->where('is_active', true)->with(['stages' => fn ($query) => $query->where('is_active', true)])->orderBy('name')->get()->map(fn (Pipeline $pipeline) => [
                'id' => $pipeline->public_id,
                'name' => $pipeline->name,
                'is_default' => $pipeline->is_default,
                'stages' => $pipeline->stages->map(fn ($stage) => [
                    'id' => $stage->public_id,
                    'name' => $stage->name,
                    'probability' => $stage->probability,
                    'color' => $stage->color,
                ]),
            ]),
            'companies' => Company::query()->orderBy('name')->get(['public_id as id', 'name']),
            'contacts' => Contact::query()->orderBy('first_name')->get(['public_id as id', 'first_name', 'last_name', 'email']),
            'assignees' => $currentOrganization->get()?->users()->wherePivot('status', 'active')->orderBy('name')->get(['users.public_id as id', 'name', 'email']) ?? [],
        ]]);
    }
}
