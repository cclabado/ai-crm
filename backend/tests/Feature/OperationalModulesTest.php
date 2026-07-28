<?php

namespace Tests\Feature;

use App\Models\AiConfiguration;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OperationalModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_contact_task_product_and_ticket_crud_endpoints(): void
    {
        [$user, $organization] = $this->context([
            'companies.view', 'companies.create', 'companies.update', 'companies.delete',
            'contacts.view', 'contacts.create', 'contacts.update', 'contacts.delete',
            'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete',
            'products.view', 'products.manage', 'tickets.view', 'tickets.manage',
        ]);
        $headers = ['X-Organization' => $organization->public_id];
        $payloads = [
            'companies' => ['name' => 'Cobalt Logistics', 'email' => 'hello@cobalt.test', 'status' => 'customer'],
            'contacts' => ['first_name' => 'Amelia', 'last_name' => 'Stone', 'email' => 'amelia@example.test'],
            'tasks' => ['title' => 'Call customer', 'priority' => 'high', 'status' => 'todo'],
            'products' => ['name' => 'Implementation', 'type' => 'service', 'unit_price' => 12500, 'currency' => 'USD', 'is_active' => true],
            'tickets' => ['subject' => 'Account access', 'priority' => 'critical', 'status' => 'open'],
        ];

        foreach ($payloads as $module => $payload) {
            $created = $this->actingAs($user)->withHeaders($headers)->postJson("/api/v1/{$module}", $payload)->assertCreated();
            $id = $created->json('data.public_id');
            $this->assertNotEmpty($id);
            $this->actingAs($user)->withHeaders($headers)->getJson("/api/v1/{$module}")->assertOk()->assertJsonCount(1, 'data');
            $this->actingAs($user)->withHeaders($headers)->getJson("/api/v1/{$module}/{$id}")->assertOk();
        }
    }

    public function test_quotation_totals_are_calculated_on_the_server(): void
    {
        [$user, $organization] = $this->context(['quotations.view', 'quotations.manage']);
        $created = $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->postJson('/api/v1/quotations', [
            'currency' => 'USD',
            'status' => 'draft',
            'items' => [[
                'name' => 'Consulting',
                'quantity' => 2,
                'unit_price' => 100,
                'discount_rate' => 10,
                'tax_rate' => 5,
            ]],
        ])->assertCreated();

        $created->assertJsonPath('data.subtotal', 200)
            ->assertJsonPath('data.discount_total', 20)
            ->assertJsonPath('data.tax_total', 9)
            ->assertJsonPath('data.total', 189);

        $this->actingAs($user)
            ->withHeader('X-Organization', $organization->public_id)
            ->get('/api/v1/quotations/'.$created->json('data.public_id').'/pdf')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_ai_is_disabled_by_default(): void
    {
        [$user, $organization] = $this->context(['ai.use']);
        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->postJson('/api/v1/ai/generate', [
            'feature' => 'next_actions',
            'context' => 'Customer requested a follow-up next week.',
        ])->assertUnprocessable()->assertJsonValidationErrors('ai');
    }

    public function test_openai_compatible_provider_can_generate_content_without_exposing_its_key(): void
    {
        [$user, $organization] = $this->context(['ai.use']);
        AiConfiguration::query()->create([
            'organization_id' => $organization->getKey(),
            'provider' => 'openai-compatible',
            'base_url' => 'https://ai.example.test/v1',
            'model' => 'crm-model',
            'encrypted_api_key' => Crypt::encryptString('secret-test-key'),
            'is_enabled' => true,
            'mock_mode' => false,
            'daily_request_limit' => 10,
        ]);
        Http::fake([
            'https://ai.example.test/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => 'Schedule a discovery call.']]],
            ]),
        ]);

        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->postJson('/api/v1/ai/generate', [
            'feature' => 'next_actions',
            'context' => 'The customer asked about implementation timing.',
        ])->assertOk()->assertJsonPath('data.content', 'Schedule a discovery call.')->assertJsonMissing(['secret-test-key']);

        Http::assertSent(fn ($request) => $request->url() === 'https://ai.example.test/v1/chat/completions'
            && $request->hasHeader('Authorization', 'Bearer secret-test-key')
            && $request['model'] === 'crm-model');
        $this->assertDatabaseHas('ai_request_logs', ['organization_id' => $organization->getKey(), 'status' => 'success']);
    }

    private function context(array $permissions): array
    {
        $organization = Organization::query()->create(['name' => 'NexusCRM Inc.', 'slug' => 'nexuscrm-inc']);
        $user = User::factory()->create();
        $organization->users()->attach($user, ['status' => 'active', 'joined_at' => now()]);
        setPermissionsTeamId($organization->getKey());
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }

        return [$user, $organization];
    }
}
