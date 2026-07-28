<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\UserInvitedNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IdentityManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_invite_a_user(): void
    {
        Notification::fake();
        [$admin, $organization] = $this->organizationAdmin();

        $this->actingAs($admin)
            ->withHeader('X-Organization', $organization->public_id)
            ->postJson('/api/v1/invitations', [
                'email' => 'sales@example.test',
                'role' => 'Sales Representative',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'sales@example.test');

        $this->assertDatabaseHas('invitations', [
            'organization_id' => $organization->getKey(),
            'email' => 'sales@example.test',
            'status' => 'pending',
        ]);
        Notification::assertSentOnDemand(UserInvitedNotification::class);
    }

    public function test_new_user_can_accept_a_valid_invitation(): void
    {
        [$admin, $organization] = $this->organizationAdmin();
        $token = 'known-invitation-token-that-is-long-enough-for-validation';
        Invitation::query()->create([
            'organization_id' => $organization->getKey(),
            'invited_by' => $admin->getKey(),
            'email' => 'new.user@example.test',
            'role_name' => 'Sales Representative',
            'token_hash' => hash('sha256', $token),
            'status' => 'pending',
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/v1/invitations/accept', [
            'token' => $token,
            'name' => 'New User',
            'password' => 'A-Strong-Password-123!',
            'password_confirmation' => 'A-Strong-Password-123!',
        ])->assertOk()->assertJsonPath('data.email', 'new.user@example.test');

        $user = User::query()->where('email', $response->json('data.email'))->firstOrFail();
        $this->assertTrue($organization->users()->whereKey($user->getKey())->exists());
        setPermissionsTeamId($organization->getKey());
        $this->assertTrue($user->hasRole('Sales Representative'));
    }

    public function test_user_can_request_and_complete_password_reset(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that address, a password reset link has been sent.');
        Notification::assertSentTo($user, ResetPassword::class);

        $token = Password::createToken($user);
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'A-New-Password-123!',
            'password_confirmation' => 'A-New-Password-123!',
        ])->assertOk();

        $this->assertCredentials(['email' => $user->email, 'password' => 'A-New-Password-123!']);
    }

    private function organizationAdmin(): array
    {
        $organization = Organization::query()->create(['name' => 'NexusCRM Inc.', 'slug' => 'nexuscrm-inc']);
        $admin = User::factory()->create();
        $organization->users()->attach($admin, ['status' => 'active', 'is_owner' => true, 'joined_at' => now()]);
        setPermissionsTeamId($organization->getKey());

        Permission::findOrCreate('users.invite', 'web');
        $admin->givePermissionTo('users.invite');
        Role::query()->create([
            'organization_id' => $organization->getKey(),
            'name' => 'Sales Representative',
            'guard_name' => 'web',
        ]);

        return [$admin, $organization];
    }
}
