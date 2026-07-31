<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->safe()->only(['email', 'password']), $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are invalid.']]);
        }

        /** @var User $user */
        $user = $request->user();

        if (! $user->isActive()) {
            Auth::logout();
            throw ValidationException::withMessages(['email' => ['This account is inactive.']]);
        }

        $request->session()->regenerate();
        $this->setOrganizationPermissions($user, $request);
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'organizations' => OrganizationResource::collection($user->organizations()->wherePivot('status', 'active')->get()),
            ],
            'message' => 'Signed in successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $this->setOrganizationPermissions($request->user(), $request);

        return response()->json([
            'data' => [
                'user' => new UserResource($request->user()),
                'organizations' => OrganizationResource::collection($request->user()->organizations()->wherePivot('status', 'active')->get()),
                'current_organization' => $request->session()->get('current_organization'),
            ],
        ]);
    }

    private function setOrganizationPermissions(User $user, Request $request): void
    {
        $publicId = $request->session()->get('current_organization');
        $organization = $user->organizations()->wherePivot('status', 'active')->when($publicId, fn ($query) => $query->where('organizations.public_id', $publicId))->first()
            ?? $user->organizations()->wherePivot('status', 'active')->first();
        if ($organization) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($organization->getKey());
            $request->session()->put('current_organization', $organization->public_id);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['data' => null, 'message' => 'Signed out successfully.']);
    }
}
