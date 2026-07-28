<?php

namespace App\Support\Tenancy;

use App\Models\Organization;

final class CurrentOrganization
{
    private ?Organization $organization = null;

    public function set(Organization $organization): void
    {
        $this->organization = $organization;
    }

    public function get(): ?Organization
    {
        return $this->organization;
    }

    public function id(): ?int
    {
        return $this->organization?->getKey();
    }

    public function clear(): void
    {
        $this->organization = null;
    }
}
