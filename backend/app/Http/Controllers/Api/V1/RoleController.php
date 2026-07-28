<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function store(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $data = $this->validated($request, $current->id());
        $role = Role::query()->create(['organization_id' => $current->id(), 'guard_name' => 'web', 'name' => $data['name']]);
        $role->syncPermissions($data['permissions']);

        return response()->json(['data' => $this->payload($role), 'message' => 'Role created successfully.'], 201);
    }

    public function update(Request $request, int $role, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $record = Role::query()->where('organization_id', $current->id())->findOrFail($role);
        $data = $this->validated($request, $current->id(), $record->getKey());
        $record->update(['name' => $data['name']]);
        $record->syncPermissions($data['permissions']);

        return response()->json(['data' => $this->payload($record), 'message' => 'Role updated successfully.']);
    }

    private function validated(Request $request, ?int $organizationId, ?int $ignore = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('roles')->where(fn ($query) => $query->where('organization_id', $organizationId)->where('guard_name', 'web'))->ignore($ignore)],
            'permissions' => 'present|array', 'permissions.*' => 'required|string|exists:permissions,name',
        ]);
        $valid = Permission::query()->where('guard_name', 'web')->whereIn('name', $data['permissions'])->pluck('name')->all();
        abort_unless(count($valid) === count(array_unique($data['permissions'])), 422, 'One or more permissions are invalid.');

        return $data;
    }

    private function payload(Role $role): array
    {
        return ['id' => $role->getKey(), 'name' => $role->name, 'permissions' => $role->permissions()->orderBy('name')->pluck('name')];
    }
}
