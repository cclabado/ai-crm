<?php

namespace Database\Seeders;

use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $organization = Organization::query()->updateOrCreate(
            ['slug' => 'nexuscrm-inc'],
            ['name' => 'NexusCRM Inc.', 'currency' => 'USD', 'timezone' => 'Asia/Manila'],
        );

        $user = User::query()->updateOrCreate(
            ['email' => 'admin@nexuscrm.test'],
            ['name' => 'David Park', 'password' => 'Password123!', 'status' => 'active'],
        );

        $organization->users()->syncWithoutDetaching([$user->getKey() => [
            'status' => 'active',
            'is_owner' => true,
            'joined_at' => now(),
        ]]);

        app(RolePermissionSeeder::class)->run($organization);
        setPermissionsTeamId($organization->getKey());
        $user->assignRole('Super Administrator');

        foreach (['Website', 'LinkedIn', 'Referral', 'Conference', 'Cold Outreach', 'Webinar'] as $position => $name) {
            LeadSource::query()->updateOrCreate(
                ['organization_id' => $organization->getKey(), 'key' => str($name)->slug()],
                ['name' => $name, 'position' => $position],
            );
        }

        foreach (['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'] as $position => $name) {
            LeadStatus::query()->updateOrCreate(
                ['organization_id' => $organization->getKey(), 'key' => str($name)->slug()],
                ['name' => $name, 'semantic_type' => $name === 'Won' ? 'won' : ($name === 'Lost' ? 'lost' : 'open'), 'position' => $position],
            );
        }

        $pipeline = Pipeline::query()->updateOrCreate(
            ['organization_id' => $organization->getKey(), 'name' => 'Default Sales Pipeline'],
            ['is_default' => true],
        );

        foreach ([
            ['Prospecting', 10, 'open'],
            ['Qualification', 25, 'open'],
            ['Proposal', 50, 'open'],
            ['Negotiation', 75, 'open'],
            ['Closed Won', 100, 'won'],
            ['Closed Lost', 0, 'lost'],
        ] as $position => [$name, $probability, $semanticType]) {
            PipelineStage::query()->updateOrCreate(
                ['pipeline_id' => $pipeline->getKey(), 'key' => str($name)->slug()],
                ['name' => $name, 'probability' => $probability, 'semantic_type' => $semanticType, 'position' => $position],
            );
        }

        app(DemoDataSeeder::class)->run($organization, $user);
    }
}
