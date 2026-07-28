<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrganizationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => OrganizationResource::collection(
                $request->user()->organizations()->wherePivot('status', 'active')->get()
            ),
        ]);
    }

    public function switch(Request $request): JsonResponse
    {
        $validated = $request->validate(['organization_id' => ['required', 'string', 'size:26']]);

        $organization = $request->user()->organizations()
            ->wherePivot('status', 'active')
            ->where('organizations.public_id', $validated['organization_id'])
            ->firstOrFail();

        $request->session()->put('current_organization', $organization->public_id);

        return response()->json([
            'data' => new OrganizationResource($organization),
            'message' => 'Organization switched successfully.',
        ]);
    }
}
