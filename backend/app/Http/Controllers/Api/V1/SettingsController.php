<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiConfiguration;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Setting;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function show(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('settings.view'), 403);
        $organization = $current->get();
        $ai = AiConfiguration::query()->where('organization_id', $organization?->getKey())->first();
        $settings = Setting::query()->where('organization_id', $organization?->getKey())->get();
        $safeSettings = $settings->map(fn (Setting $setting) => [
            'group' => $setting->group,
            'key' => $setting->key,
            'value' => $setting->is_encrypted ? null : $setting->value,
            'configured' => $setting->is_encrypted ? filled($setting->value) : null,
        ])->groupBy('group');

        return response()->json(['data' => [
            'company' => $organization?->only(['name', 'currency', 'timezone', 'locale', 'date_format']),
            'settings' => $safeSettings,
            'lead_sources' => LeadSource::query()->orderBy('position')->get(['public_id as id', 'name', 'color', 'position', 'is_active']),
            'lead_statuses' => LeadStatus::query()->orderBy('position')->get(['public_id as id', 'name', 'color', 'semantic_type', 'position', 'is_active']),
            'pipelines' => Pipeline::query()->with('stages')->orderBy('name')->get(),
            'notification_preferences' => DB::table('notification_preferences')->where('organization_id', $organization?->getKey())->where('user_id', $request->user()->getKey())->get(),
            'ai' => $ai ? [...$ai->only(['provider', 'base_url', 'model', 'is_enabled', 'mock_mode', 'daily_request_limit', 'allowed_features']), 'has_api_key' => filled($ai->encrypted_api_key)] : ['provider' => 'openai-compatible', 'is_enabled' => false, 'mock_mode' => true, 'has_api_key' => false],
        ]]);
    }

    public function update(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403);
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'currency' => 'required|string|size:3',
            'timezone' => 'required|timezone',
            'locale' => ['required', Rule::in(['en', 'en_US', 'en_GB', 'fil', 'es', 'fr', 'de', 'it', 'pt_BR', 'ja', 'ko', 'zh_CN', 'zh_TW', 'ar'])],
            'date_format' => ['required', Rule::in(['Y-m-d', 'm/d/Y', 'd/m/Y', 'd M Y', 'M j, Y'])],
        ]);
        $current->get()?->update($data);

        return response()->json(['data' => $current->get(), 'message' => 'Settings updated successfully.']);
    }

    public function updateAi(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('ai.configure'), 403);
        $data = $request->validate(['provider' => ['required', Rule::in(['openai-compatible'])], 'base_url' => 'nullable|url|max:2048', 'model' => 'nullable|string|max:120', 'api_key' => 'nullable|string|max:4096', 'is_enabled' => 'required|boolean', 'mock_mode' => 'required|boolean', 'daily_request_limit' => 'required|integer|between:1,10000']);
        $config = AiConfiguration::query()->firstOrNew(['organization_id' => $current->id()]);
        $config->fill(collect($data)->except('api_key')->all());
        if (filled($data['api_key'] ?? null)) {
            $config->encrypted_api_key = Crypt::encryptString($data['api_key']);
        }
        $config->save();

        return response()->json(['data' => ['has_api_key' => filled($config->encrypted_api_key)], 'message' => 'AI settings updated securely.']);
    }

    public function logo(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403);
        $data = $request->validate(['logo' => 'required|image|mimes:png,jpg,jpeg,webp|max:2048']);
        $organization = $current->get();
        if ($organization?->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
        }
        $path = $data['logo']->store('organization-logos', 'public');
        $organization?->update(['logo_path' => $path]);

        return response()->json(['data' => ['logo_url' => asset('storage/'.$path)], 'message' => 'Company logo updated.']);
    }

    public function catalog(Request $request, string $type): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403);
        abort_unless(in_array($type, ['lead-sources', 'lead-statuses', 'pipeline-stages'], true), 404);
        $data = $request->validate(['id' => 'nullable|string|size:26', 'pipeline_id' => 'nullable|string|size:26', 'name' => 'required|string|max:120', 'color' => 'nullable|string|max:20', 'semantic_type' => 'nullable|in:open,won,lost', 'probability' => 'nullable|integer|between:0,100', 'position' => 'nullable|integer|min:0', 'is_active' => 'sometimes|boolean']);
        if ($type === 'pipeline-stages') {
            validator($data, ['pipeline_id' => 'required|string|size:26', 'position' => 'required|integer|min:0'])->validate();
        }
        $record = match ($type) {
            'lead-sources' => $this->saveCatalog(LeadSource::class, $data, ['key' => Str::slug($data['name'])]),
            'lead-statuses' => $this->saveCatalog(LeadStatus::class, $data, ['key' => Str::slug($data['name']), 'semantic_type' => $data['semantic_type'] ?? 'open']),
            'pipeline-stages' => $this->saveStage($data),
            default => null,
        };

        return response()->json(['data' => $record, 'message' => 'Configuration saved successfully.']);
    }

    public function notificationPreferences(Request $request, CurrentOrganization $current): JsonResponse
    {
        $data = $request->validate(['preferences' => 'required|array|max:20', 'preferences.*.event' => 'required|string|max:80', 'preferences.*.in_app' => 'required|boolean', 'preferences.*.email' => 'required|boolean']);
        foreach ($data['preferences'] as $preference) {
            DB::table('notification_preferences')->updateOrInsert(['organization_id' => $current->id(), 'user_id' => $request->user()->getKey(), 'event' => $preference['event']], [...$preference, 'updated_at' => now(), 'created_at' => now()]);
        }

        return response()->json(['data' => $data['preferences'], 'message' => 'Notification preferences updated.']);
    }

    public function email(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403);
        $data = $request->validate(['from_name' => 'required|string|max:120', 'from_address' => 'required|email|max:255', 'host' => 'required|string|max:255', 'port' => 'required|integer|between:1,65535', 'encryption' => ['nullable', Rule::in(['tls', 'ssl'])], 'username' => 'nullable|string|max:255', 'password' => 'nullable|string|max:4096']);
        foreach ($data as $key => $value) {
            if ($key === 'password' && blank($value)) {
                continue;
            }
            Setting::query()->updateOrCreate(['organization_id' => $current->id(), 'group' => 'email', 'key' => $key], ['type' => 'string', 'value' => $key === 'password' ? Crypt::encryptString($value) : $value, 'is_encrypted' => $key === 'password']);
        }

        return response()->json(['data' => ['configured' => true], 'message' => 'Email settings stored securely.']);
    }

    private function saveCatalog(string $model, array $data, array $defaults): object
    {
        $record = isset($data['id']) ? $model::query()->where('public_id', $data['id'])->firstOrFail() : new $model;
        $record->fill([...$defaults, ...collect($data)->except(['id', 'pipeline_id', 'probability'])->all()])->save();

        return $record;
    }

    private function saveStage(array $data): PipelineStage
    {
        $pipeline = Pipeline::query()->where('public_id', $data['pipeline_id'])->firstOrFail();
        $record = isset($data['id']) ? $pipeline->stages()->where('public_id', $data['id'])->firstOrFail() : new PipelineStage(['pipeline_id' => $pipeline->getKey(), 'key' => Str::slug($data['name'])]);
        $record->fill(collect($data)->only(['name', 'color', 'semantic_type', 'probability', 'position', 'is_active'])->all());
        $pipeline->stages()->save($record);

        return $record;
    }
}
