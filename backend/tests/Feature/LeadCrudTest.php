<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LeadCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_create_list_update_archive_and_restore_a_lead(): void
    {
        [$user, $organization, $source, $status] = $this->leadContext();
        $headers = ['X-Organization' => $organization->public_id];

        $created = $this->actingAs($user)->withHeaders($headers)->postJson('/api/v1/leads', [
            'first_name' => 'Amelia',
            'last_name' => 'Stone',
            'company_name' => 'Cobalt Logistics',
            'email' => 'amelia@example.test',
            'source_id' => $source->public_id,
            'status_id' => $status->public_id,
            'assigned_to' => $user->public_id,
            'priority' => 'high',
            'score' => 82,
            'estimated_value' => 125000,
            'currency' => 'USD',
        ])->assertCreated()
            ->assertJsonPath('data.full_name', 'Amelia Stone')
            ->assertJsonPath('data.status.id', $status->public_id);

        $leadId = $created->json('data.id');

        $this->assertDatabaseHas('leads', [
            'public_id' => $leadId,
            'organization_id' => $organization->getKey(),
            'email' => 'amelia@example.test',
        ]);
        $this->assertDatabaseHas('activities', ['organization_id' => $organization->getKey(), 'type' => 'lead.created']);

        $this->actingAs($user)->withHeaders($headers)->getJson('/api/v1/leads?search=Cobalt&priority=high')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($user)->withHeaders($headers)->patchJson("/api/v1/leads/{$leadId}", [
            'priority' => 'critical',
            'estimated_value' => 150000,
        ])->assertOk()->assertJsonPath('data.priority', 'critical');

        $this->actingAs($user)->withHeaders($headers)->deleteJson("/api/v1/leads/{$leadId}")->assertNoContent();
        $this->assertSoftDeleted('leads', ['public_id' => $leadId]);

        $this->actingAs($user)->withHeaders($headers)->postJson("/api/v1/leads/{$leadId}/restore")
            ->assertOk()->assertJsonPath('data.id', $leadId);
        $this->assertNotSoftDeleted('leads', ['public_id' => $leadId]);
    }

    public function test_leads_are_isolated_between_organizations(): void
    {
        [$user, $organization, , $status] = $this->leadContext();
        $other = Organization::query()->create(['name' => 'Other', 'slug' => 'other']);
        $foreignLead = Lead::query()->create([
            'organization_id' => $other->getKey(),
            'first_name' => 'Private',
            'priority' => 'medium',
            'currency' => 'USD',
        ]);

        $this->actingAs($user)
            ->withHeader('X-Organization', $organization->public_id)
            ->getJson("/api/v1/leads/{$foreignLead->public_id}")
            ->assertNotFound();

        $this->assertNotNull($status->public_id);
    }

    private function leadContext(): array
    {
        $organization = Organization::query()->create(['name' => 'NexusCRM Inc.', 'slug' => 'nexuscrm-inc']);
        $user = User::factory()->create();
        $organization->users()->attach($user, ['status' => 'active', 'joined_at' => now()]);
        setPermissionsTeamId($organization->getKey());

        foreach (['view', 'create', 'update', 'delete', 'restore', 'bulk-update'] as $action) {
            $permission = Permission::findOrCreate("leads.{$action}", 'web');
            $user->givePermissionTo($permission);
        }

        $source = LeadSource::query()->create([
            'organization_id' => $organization->getKey(),
            'key' => 'website',
            'name' => 'Website',
        ]);
        $status = LeadStatus::query()->create([
            'organization_id' => $organization->getKey(),
            'key' => 'new',
            'name' => 'New',
        ]);

        return [$user, $organization, $source, $status];
    }
}
