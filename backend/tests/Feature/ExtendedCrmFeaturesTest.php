<?php

namespace Tests\Feature;

use App\Jobs\SendCrmEmail;
use App\Models\Organization;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ExtendedCrmFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_contacts_can_be_imported_searched_and_exported(): void
    {
        [$user, $organization] = $this->context(['contacts.view', 'contacts.create']);
        $headers = ['X-Organization' => $organization->public_id];
        $csv = "first_name,last_name,email,status\nAmelia,Stone,amelia@example.test,active\nInvalid,,not-an-email,active\n";

        $this->actingAs($user)->withHeaders($headers)->post('/api/v1/contacts/import', [
            'file' => UploadedFile::fake()->createWithContent('contacts.csv', $csv),
        ])->assertOk()->assertJsonPath('data.created', 1)->assertJsonPath('data.failed', 1);

        $this->actingAs($user)->withHeaders($headers)->getJson('/api/v1/search?q=Amelia')
            ->assertOk()->assertJsonPath('data.0.type', 'contact');
        $this->actingAs($user)->withHeaders($headers)->get('/api/v1/contacts/export')
            ->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_notes_tags_and_ticket_conversations_are_tenant_scoped(): void
    {
        [$user, $organization] = $this->context(['tickets.view', 'tickets.manage']);
        $ticket = SupportTicket::query()->create(['organization_id' => $organization->getKey(), 'created_by' => $user->getKey(), 'number' => 'TKT-1', 'subject' => 'Cannot sign in', 'status' => 'open']);
        $headers = ['X-Organization' => $organization->public_id];

        $this->actingAs($user)->withHeaders($headers)->postJson("/api/v1/engagement/ticket/{$ticket->public_id}/notes", ['body' => 'Called the customer.'])->assertCreated();
        $this->actingAs($user)->withHeaders($headers)->putJson("/api/v1/engagement/ticket/{$ticket->public_id}/tags", ['tags' => ['urgent', 'access']])->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($user)->withHeaders($headers)->postJson("/api/v1/tickets/{$ticket->public_id}/messages", ['body' => 'We are investigating this now.'])->assertCreated();
        $this->actingAs($user)->withHeaders($headers)->getJson("/api/v1/engagement/ticket/{$ticket->public_id}")->assertOk()->assertJsonCount(1, 'data.notes')->assertJsonCount(2, 'data.tags');
        $this->assertDatabaseHas('support_tickets', ['id' => $ticket->getKey(), 'status' => 'pending']);
    }

    public function test_settings_never_expose_encrypted_credentials(): void
    {
        [$user, $organization] = $this->context(['settings.view', 'settings.manage', 'roles.view', 'roles.manage']);
        Setting::query()->create(['organization_id' => $organization->getKey(), 'group' => 'email', 'key' => 'password', 'value' => Crypt::encryptString('smtp-secret'), 'is_encrypted' => true]);

        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->getJson('/api/v1/settings')
            ->assertOk()->assertJsonMissing(['smtp-secret'])->assertJsonPath('data.settings.email.0.value', null)->assertJsonPath('data.settings.email.0.configured', true);

        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->putJson('/api/v1/settings/catalog/lead-sources', ['name' => 'Partner referral', 'position' => 0, 'is_active' => true])->assertOk();
        $this->assertDatabaseHas('lead_sources', ['organization_id' => $organization->getKey(), 'key' => 'partner-referral']);

        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->postJson('/api/v1/roles', ['name' => 'Regional Analyst', 'permissions' => ['settings.view']])->assertCreated();
        $this->assertDatabaseHas('roles', ['organization_id' => $organization->getKey(), 'name' => 'Regional Analyst']);
    }

    public function test_outbound_email_is_queued_for_delivery(): void
    {
        Queue::fake();
        [$user, $organization] = $this->context(['email.view', 'email.send']);

        $this->actingAs($user)->withHeader('X-Organization', $organization->public_id)->postJson('/api/v1/email/send', [
            'to' => ['customer@example.test'], 'subject' => 'Follow up', 'body' => 'Thank you for your time.',
        ])->assertCreated()->assertJsonPath('data.messages.0.status', 'queued');

        Queue::assertPushed(SendCrmEmail::class);
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
