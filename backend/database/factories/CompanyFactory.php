<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Company> */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return ['organization_id' => Organization::factory(), 'name' => fake()->company(), 'industry' => fake()->randomElement(['Technology', 'Retail', 'Finance', 'Logistics']), 'email' => fake()->companyEmail(), 'status' => 'customer'];
    }
}
