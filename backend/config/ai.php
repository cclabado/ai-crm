<?php

return [
    'enabled' => (bool) env('AI_ENABLED', false),
    'mock_mode' => (bool) env('AI_MOCK_MODE', true),
    'default_provider' => env('AI_DEFAULT_PROVIDER', 'openai-compatible'),
    'default_model' => env('AI_DEFAULT_MODEL'),
    'daily_request_limit' => (int) env('AI_DAILY_REQUEST_LIMIT', 50),
];
