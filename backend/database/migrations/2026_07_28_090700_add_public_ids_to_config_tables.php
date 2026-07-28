<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['lead_sources', 'lead_statuses'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->ulid('public_id')->nullable()->unique()->after('id');
            });

            DB::table($tableName)->orderBy('id')->eachById(function (object $record) use ($tableName): void {
                DB::table($tableName)->where('id', $record->id)->update(['public_id' => (string) Str::ulid()]);
            });
        }
    }

    public function down(): void
    {
        Schema::table('lead_sources', fn (Blueprint $table) => $table->dropColumn('public_id'));
        Schema::table('lead_statuses', fn (Blueprint $table) => $table->dropColumn('public_id'));
    }
};
