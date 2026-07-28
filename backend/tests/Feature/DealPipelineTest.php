<?php

namespace Tests\Feature;

use App\Models\Deal;
use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DealPipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_create_and_move_a_deal_across_the_pipeline(): void
    {
        [$user, $organization, $pipeline, $prospecting, $won] = $this->dealContext();
        $headers = ['X-Organization' => $organization->public_id];

        $created = $this->actingAs($user)->withHeaders($headers)->postJson('/api/v1/deals', [
            'name' => 'Enterprise rollout',
            'pipeline_id' => $pipeline->public_id,
            'stage_id' => $prospecting->public_id,
            'assigned_to' => $user->public_id,
            'value' => 85000,
            'currency' => 'USD',
            'probability' => 10,
            'expected_close_date' => now()->addMonth()->toDateString(),
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Enterprise rollout')
            ->assertJsonPath('data.stage.id', $prospecting->public_id);

        $dealId = $created->json('data.id');

        $this->actingAs($user)->withHeaders($headers)->getJson('/api/v1/deals/pipeline')
            ->assertOk()
            ->assertJsonPath('data.id', $pipeline->public_id)
            ->assertJsonPath('data.stages.0.deal_count', 1)
            ->assertJsonPath('data.stages.0.deals.0.id', $dealId);

        $this->actingAs($user)->withHeaders($headers)->patchJson("/api/v1/deals/{$dealId}/stage", [
            'stage_id' => $won->public_id,
            'reason' => 'Proposal accepted',
        ])->assertOk()
            ->assertJsonPath('data.stage.id', $won->public_id)
            ->assertJsonPath('data.status', 'won')
            ->assertJsonPath('data.probability', 100);

        $this->assertDatabaseHas('deal_stage_history', [
            'deal_id' => Deal::query()->where('public_id', $dealId)->value('id'),
            'from_stage_id' => $prospecting->getKey(),
            'to_stage_id' => $won->getKey(),
            'reason' => 'Proposal accepted',
        ]);
        $this->assertDatabaseHas('activities', [
            'organization_id' => $organization->getKey(),
            'type' => 'deal.stage_moved',
        ]);
    }

    public function test_a_deal_from_another_organization_is_not_visible(): void
    {
        [$user, $organization] = $this->dealContext();
        $other = Organization::query()->create(['name' => 'Private Workspace', 'slug' => 'private-workspace']);
        $otherPipeline = Pipeline::withoutGlobalScopes()->create([
            'organization_id' => $other->getKey(),
            'name' => 'Private Pipeline',
            'is_default' => true,
        ]);
        $otherStage = PipelineStage::query()->create([
            'pipeline_id' => $otherPipeline->getKey(),
            'key' => 'prospecting',
            'name' => 'Prospecting',
        ]);
        $foreignDeal = Deal::withoutGlobalScopes()->create([
            'organization_id' => $other->getKey(),
            'pipeline_id' => $otherPipeline->getKey(),
            'pipeline_stage_id' => $otherStage->getKey(),
            'name' => 'Confidential deal',
            'currency' => 'USD',
        ]);

        $this->actingAs($user)
            ->withHeader('X-Organization', $organization->public_id)
            ->getJson("/api/v1/deals/{$foreignDeal->public_id}")
            ->assertNotFound();
    }

    private function dealContext(): array
    {
        $organization = Organization::query()->create(['name' => 'NexusCRM Inc.', 'slug' => 'nexuscrm-inc']);
        $user = User::factory()->create();
        $organization->users()->attach($user, ['status' => 'active', 'joined_at' => now()]);
        setPermissionsTeamId($organization->getKey());

        foreach (['view', 'create', 'update', 'delete', 'move'] as $action) {
            $user->givePermissionTo(Permission::findOrCreate("deals.{$action}", 'web'));
        }

        $pipeline = Pipeline::query()->create([
            'organization_id' => $organization->getKey(),
            'name' => 'Sales Pipeline',
            'is_default' => true,
        ]);
        $prospecting = PipelineStage::query()->create([
            'pipeline_id' => $pipeline->getKey(),
            'key' => 'prospecting',
            'name' => 'Prospecting',
            'probability' => 10,
            'position' => 1,
            'semantic_type' => 'open',
        ]);
        $won = PipelineStage::query()->create([
            'pipeline_id' => $pipeline->getKey(),
            'key' => 'closed-won',
            'name' => 'Closed Won',
            'probability' => 100,
            'position' => 2,
            'semantic_type' => 'won',
        ]);

        return [$user, $organization, $pipeline, $prospecting, $won];
    }
}
