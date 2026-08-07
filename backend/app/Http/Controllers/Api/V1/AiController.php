<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiConfiguration;
use App\Models\AiRequestLog;
use App\Support\Tenancy\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AiController extends Controller
{
    public function generate(Request $request, CurrentOrganization $current): JsonResponse
    {
        abort_unless($request->user()->can('ai.use'), 403);
        $data = $request->validate(['feature' => 'required|in:chat,follow_up_email,interaction_summary,meeting_summary,next_actions,proposal_description,lead_priority,sentiment', 'context' => 'required|string|max:20000']);
        $config = AiConfiguration::query()->where('organization_id', $current->id())->first();
        if (! $config?->is_enabled) {
            throw ValidationException::withMessages(['ai' => ['AI is disabled. Enable it in Settings before using this feature.']]);
        }
        if (! $config->mock_mode && blank($config->encrypted_api_key)) {
            throw ValidationException::withMessages(['api_key' => ['An API key is required when mock mode is disabled.']]);
        }
        $today = AiRequestLog::query()->where('created_at', '>=', now()->startOfDay())->count();
        if ($today >= $config->daily_request_limit) {
            throw ValidationException::withMessages(['limit' => ['The daily AI request limit has been reached.']]);
        }
        $startedAt = hrtime(true);
        try {
            $result = $config->mock_mode ? $this->mock($data['feature'], $data['context']) : $this->requestProvider($config, $data['feature'], $data['context']);
            $this->log($current->id(), $request->user()->getKey(), $config, $data, 'success', $startedAt);
        } catch (ValidationException $exception) {
            $this->log($current->id(), $request->user()->getKey(), $config, $data, 'failed', $startedAt, $exception->getMessage());
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);
            $this->log($current->id(), $request->user()->getKey(), $config, $data, 'failed', $startedAt, 'Provider request failed.');
            throw ValidationException::withMessages(['provider' => ['The AI provider is unavailable. The CRM remains fully operational; try again later or enable mock mode.']]);
        }

        return response()->json(['data' => ['content' => $result, 'mock' => $config->mock_mode]]);
    }

    private function mock(string $feature, string $context): string
    {
        $summary = Str::limit(trim(preg_replace('/\s+/', ' ', $context)), 240);

        return match ($feature) {
            'follow_up_email' => "Subject: Following up\n\nHi there,\n\nThank you for your time. Based on our discussion about {$summary}, I’d be happy to help with the next steps.\n\nBest regards,",
            'chat' => "I can help with CRM follow-ups, customer summaries, deal next steps, and proposal preparation. Based on your message: {$summary}",
            'next_actions' => "1. Confirm the customer's primary objective.\n2. Schedule the next follow-up.\n3. Share the relevant proposal and timeline.",
            'lead_priority' => 'Suggested priority: Medium. Review engagement, budget, authority, need, and timeline before finalizing.',
            'sentiment' => 'Sentiment: Neutral to positive. Validate this assessment against the full interaction history.',
            default => "Summary: {$summary}",
        };
    }

    private function requestProvider(AiConfiguration $config, string $feature, string $context): string
    {
        $baseUrl = rtrim($config->base_url ?: 'https://api.openai.com/v1', '/');
        $response = Http::acceptJson()
            ->withToken(Crypt::decryptString($config->encrypted_api_key))
            ->timeout(30)
            ->connectTimeout(10)
            ->retry(2, 250, throw: false)
            ->post($baseUrl.'/chat/completions', [
                'model' => $config->model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a concise CRM chatbot for sales and support teams. Answer questions clearly, do not invent customer facts, and suggest safe next actions when useful.'],
                    ['role' => 'user', 'content' => "Feature: {$feature}\n\nCustomer context:\n{$context}"],
                ],
                'temperature' => 0.3,
            ]);

        if (! $response->successful()) {
            throw ValidationException::withMessages(['provider' => [match ($response->status()) {
                401, 403 => 'The AI provider rejected the configured credentials.',
                429 => 'The AI provider rate limit was reached. Try again later.',
                default => 'The AI provider could not complete the request.',
            }]]);
        }

        $content = $response->json('choices.0.message.content');
        if (! is_string($content) || blank($content)) {
            throw ValidationException::withMessages(['provider' => ['The AI provider returned an invalid response.']]);
        }

        return trim($content);
    }

    private function log(?int $organizationId, int $userId, AiConfiguration $config, array $data, string $status, int $startedAt, ?string $error = null): void
    {
        AiRequestLog::query()->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'feature' => $data['feature'],
            'provider' => $config->provider,
            'model' => $config->model,
            'status' => $status,
            'latency_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
            'request_hash' => hash('sha256', $data['context']),
            'error_message' => $error ? Str::limit($error, 1000) : null,
            'created_at' => now(),
        ]);
    }
}
