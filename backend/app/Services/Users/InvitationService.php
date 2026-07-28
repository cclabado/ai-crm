<?php

namespace App\Services\Users;

use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\UserInvitedNotification;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

final class InvitationService
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    public function invite(string $email, string $roleName, User $inviter): Invitation
    {
        $organization = $this->currentOrganization->get();
        $role = Role::query()->where('organization_id', $organization?->getKey())->where('name', $roleName)->first();
        if (! $role) {
            throw ValidationException::withMessages(['role' => ['The selected role is invalid.']]);
        }

        $existingUser = User::query()->where('email', $email)->first();
        if ($existingUser && $organization?->users()->whereKey($existingUser->getKey())->exists()) {
            throw ValidationException::withMessages(['email' => ['This user already belongs to the organization.']]);
        }

        $plainToken = Str::random(64);
        $invitation = Invitation::query()->updateOrCreate(
            ['email' => Str::lower($email), 'status' => 'pending'],
            [
                'invited_by' => $inviter->getKey(),
                'role_name' => $roleName,
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => now()->addDays(7),
            ],
        );

        Notification::route('mail', $email)->notify(new UserInvitedNotification($organization, $inviter->name, $plainToken));

        return $invitation;
    }

    public function accept(array $data): User
    {
        $invitation = Invitation::query()
            ->withoutGlobalScope('organization')
            ->where('token_hash', hash('sha256', $data['token']))
            ->where('status', 'pending')
            ->first();

        if (! $invitation || $invitation->expires_at->isPast()) {
            throw ValidationException::withMessages(['token' => ['This invitation is invalid or has expired.']]);
        }

        return DB::transaction(function () use ($data, $invitation): User {
            /** @var Organization $organization */
            $organization = Organization::query()->findOrFail($invitation->organization_id);
            $user = User::query()->where('email', $invitation->email)->first();

            if ($user && ! Hash::check($data['password'], $user->password)) {
                throw ValidationException::withMessages(['password' => ['Use your existing account password to accept this invitation.']]);
            }

            if (! $user) {
                $user = User::query()->create([
                    'name' => $data['name'],
                    'email' => $invitation->email,
                    'password' => $data['password'],
                    'email_verified_at' => now(),
                    'status' => 'active',
                ]);
            }

            $organization->users()->syncWithoutDetaching([$user->getKey() => [
                'status' => 'active',
                'joined_at' => now(),
            ]]);

            app(PermissionRegistrar::class)->setPermissionsTeamId($organization->getKey());
            $user->syncRoles([$invitation->role_name]);
            $invitation->update(['status' => 'accepted', 'accepted_at' => now()]);

            return $user;
        });
    }
}
