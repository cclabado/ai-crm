<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(Organization $organization): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'users.view', 'users.invite', 'users.update', 'users.deactivate',
            'roles.view', 'roles.manage',
            'leads.view', 'leads.create', 'leads.update', 'leads.delete', 'leads.restore', 'leads.assign', 'leads.bulk-update',
            'contacts.view', 'contacts.create', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
            'companies.view', 'companies.create', 'companies.update', 'companies.delete',
            'deals.view', 'deals.create', 'deals.update', 'deals.delete', 'deals.move',
            'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.assign',
            'activities.view', 'activities.create',
            'products.view', 'products.manage',
            'quotations.view', 'quotations.manage', 'quotations.send',
            'invoices.view', 'invoices.manage',
            'tickets.view', 'tickets.manage', 'tickets.assign',
            'email.view', 'email.send',
            'documents.view', 'documents.manage',
            'reports.view', 'reports.export',
            'settings.view', 'settings.manage',
            'audit.view', 'ai.use', 'ai.configure',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $all = Permission::query()->pluck('name')->all();
        $viewOnly = array_values(array_filter($all, fn (string $permission): bool => str_ends_with($permission, '.view')));
        $sales = array_values(array_filter($all, fn (string $permission): bool => str_starts_with($permission, 'dashboard.')
            || str_starts_with($permission, 'leads.')
            || str_starts_with($permission, 'contacts.')
            || str_starts_with($permission, 'companies.')
            || str_starts_with($permission, 'deals.')
            || str_starts_with($permission, 'tasks.')
            || str_starts_with($permission, 'activities.')
            || str_starts_with($permission, 'quotations.')));
        $support = array_values(array_filter($all, fn (string $permission): bool => str_starts_with($permission, 'dashboard.')
            || $permission === 'contacts.view'
            || $permission === 'companies.view'
            || str_starts_with($permission, 'tasks.')
            || str_starts_with($permission, 'activities.')
            || str_starts_with($permission, 'tickets.')
            || str_starts_with($permission, 'documents.')));

        $roleMap = [
            'Super Administrator' => $all,
            'Administrator' => array_values(array_diff($all, ['ai.configure'])),
            'Sales Manager' => array_values(array_unique([...$sales, 'users.view', 'reports.view', 'reports.export', 'products.view', 'invoices.view'])),
            'Sales Representative' => array_values(array_diff($sales, ['leads.delete', 'contacts.delete', 'companies.delete', 'deals.delete', 'leads.bulk-update'])),
            'Support Staff' => $support,
            'Read-Only User' => $viewOnly,
        ];

        foreach ($roleMap as $name => $rolePermissions) {
            $role = Role::firstOrCreate([
                'organization_id' => $organization->getKey(),
                'name' => $name,
                'guard_name' => 'web',
            ]);
            $role->syncPermissions($rolePermissions);
        }
    }
}
