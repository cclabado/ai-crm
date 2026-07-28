<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\AcceptInvitationRequest;
use App\Http\Requests\User\InviteUserRequest;
use App\Http\Resources\UserResource;
use App\Services\Users\InvitationService;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    public function store(InviteUserRequest $request, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->invite(
            $request->validated('email'),
            $request->validated('role'),
            $request->user(),
        );

        return response()->json([
            'data' => [
                'id' => $invitation->public_id,
                'email' => $invitation->email,
                'role' => $invitation->role_name,
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ],
            'message' => 'Invitation queued for delivery.',
        ], 201);
    }

    public function accept(AcceptInvitationRequest $request, InvitationService $invitations): JsonResponse
    {
        $user = $invitations->accept($request->validated());

        return response()->json([
            'data' => new UserResource($user),
            'message' => 'Invitation accepted. You can now sign in.',
        ]);
    }
}
