<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_sign_in_and_receive_organizations(): void
    {
        [$user, $organization] = $this->createOrganizationUser();

        $response = $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
            'remember' => true,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonPath('data.organizations.0.id', $organization->public_id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $user = User::factory()->create(['password' => 'Password123!']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'incorrect-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_inactive_user_cannot_sign_in(): void
    {
        $user = User::factory()->create(['password' => 'Password123!', 'status' => 'inactive']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_organization_middleware_rejects_non_members_and_allows_members(): void
    {
        [$user, $organization] = $this->createOrganizationUser();
        $otherOrganization = Organization::query()->create(['name' => 'Other Company', 'slug' => 'other-company']);

        $this->actingAs($user)
            ->withHeader('X-Organization', $otherOrganization->public_id)
            ->getJson('/api/v1/health')
            ->assertForbidden();

        $this->actingAs($user)
            ->withHeader('X-Organization', $organization->public_id)
            ->getJson('/api/v1/health')
            ->assertOk()
            ->assertHeader('X-Organization', $organization->public_id);
    }

    /** @return array{User, Organization} */
    private function createOrganizationUser(): array
    {
        $organization = Organization::query()->create(['name' => 'NexusCRM Inc.', 'slug' => 'nexuscrm-inc']);
        $user = User::factory()->create(['password' => 'Password123!']);
        $organization->users()->attach($user, [
            'status' => 'active',
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        return [$user, $organization];
    }
}
