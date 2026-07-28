<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Task> */
class TaskFactory extends Factory
{
    public function definition(): array
    {
        return ['organization_id' => Organization::factory(), 'title' => fake()->sentence(4), 'type' => 'task', 'priority' => fake()->randomElement(['low', 'medium', 'high']), 'status' => 'todo', 'due_at' => fake()->dateTimeBetween('now', '+2 weeks')];
    }
}
