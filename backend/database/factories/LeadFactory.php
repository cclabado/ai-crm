<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Lead> */
class LeadFactory extends Factory
{
    public function definition(): array
    {
        return ['organization_id' => Organization::factory(), 'first_name' => fake()->firstName(), 'last_name' => fake()->lastName(), 'company_name' => fake()->company(), 'email' => fake()->unique()->safeEmail(), 'priority' => fake()->randomElement(['low', 'medium', 'high']), 'score' => fake()->numberBetween(20, 95), 'estimated_value' => fake()->randomFloat(2, 1000, 100000), 'currency' => 'USD'];
    }
}
