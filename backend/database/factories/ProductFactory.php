<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return ['organization_id' => Organization::factory(), 'type' => 'service', 'sku' => fake()->unique()->bothify('SRV-####'), 'name' => fake()->words(3, true), 'unit_price' => fake()->randomFloat(2, 100, 20000), 'currency' => 'USD', 'is_active' => true];
    }
}
