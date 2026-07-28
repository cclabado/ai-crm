<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request, CurrentOrganization $currentOrganization): JsonResponse
    {
        abort_unless($request->user()->can('users.view'), 403);
        $users = $currentOrganization->get()?->users()
            ->with('roles')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'data' => UserResource::collection($users?->items() ?? []),
            'meta' => $users ? [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ] : [],
        ]);
    }

    public function update(UpdateUserRequest $request, string $user, CurrentOrganization $currentOrganization): UserResource
    {
        $record = $currentOrganization->get()?->users()->where('users.public_id', $user)->firstOrFail();
        $data = $request->validated();

        if (($data['status'] ?? null) === 'inactive' && $record->is($request->user())) {
            throw ValidationException::withMessages(['status' => ['You cannot deactivate your own account.']]);
        }

        if (isset($data['role'])) {
            $role = Role::query()
                ->where('organization_id', $currentOrganization->id())
                ->where('name', $data['role'])
                ->first();
            if (! $role) {
                throw ValidationException::withMessages(['role' => ['The selected role is invalid.']]);
            }
            $record->syncRoles([$role]);
        }

        if (isset($data['status'])) {
            $record->update([
                'status' => $data['status'],
                'deactivated_at' => $data['status'] === 'inactive' ? now() : null,
            ]);
            $currentOrganization->get()?->users()->updateExistingPivot($record->getKey(), ['status' => $data['status']]);
        }

        if (isset($data['name'])) {
            $record->update(['name' => $data['name']]);
        }

        return new UserResource($record->refresh()->load('roles'));
    }

    public function roles(Request $request, CurrentOrganization $currentOrganization): JsonResponse
    {
        abort_unless($request->user()->can('roles.view') || $request->user()->can('users.invite'), 403);

        return response()->json(['data' => Role::query()
            ->where('organization_id', $currentOrganization->id())
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->getKey(),
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]),
            'available_permissions' => Permission::query()->orderBy('name')->pluck('name'),
        ]);
    }
}
