<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(Organization $organization, User $owner): void
    {
        $company = Company::query()->firstOrCreate(['organization_id' => $organization->getKey(), 'name' => 'Northstar Digital'], ['industry' => 'Technology', 'email' => 'hello@northstar.example', 'status' => 'customer', 'account_manager_id' => $owner->getKey()]);
        Contact::query()->firstOrCreate(['organization_id' => $organization->getKey(), 'email' => 'maya@northstar.example'], ['first_name' => 'Maya', 'last_name' => 'Reyes', 'job_title' => 'Operations Director', 'owner_id' => $owner->getKey()]);
        Lead::query()->firstOrCreate(['organization_id' => $organization->getKey(), 'email' => 'alex@harbor.example'], ['first_name' => 'Alex', 'last_name' => 'Morgan', 'company_name' => 'Harbor & Co.', 'priority' => 'high', 'score' => 82, 'estimated_value' => 48000, 'currency' => $organization->currency, 'lead_source_id' => LeadSource::query()->where('key', 'website')->value('id'), 'lead_status_id' => LeadStatus::query()->where('key', 'qualified')->value('id'), 'assigned_to' => $owner->getKey()]);
        Task::query()->firstOrCreate(['organization_id' => $organization->getKey(), 'title' => 'Follow up with Northstar Digital'], ['created_by' => $owner->getKey(), 'assigned_to' => $owner->getKey(), 'type' => 'follow_up', 'priority' => 'high', 'status' => 'todo', 'due_at' => now()->addDay()]);
        Product::query()->firstOrCreate(['organization_id' => $organization->getKey(), 'sku' => 'SRV-IMPLEMENT'], ['type' => 'service', 'name' => 'CRM Implementation', 'unit_price' => 12500, 'currency' => $organization->currency, 'is_active' => true]);
        $company->contacts()->syncWithoutDetaching(Contact::query()->where('email', 'maya@northstar.example')->pluck('id'));
    }
}
