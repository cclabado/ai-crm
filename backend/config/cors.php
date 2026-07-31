<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // Support both local hostnames used by Vite/XAMPP while allowing production
    // deployments to provide an explicit comma-separated CORS_ALLOWED_ORIGINS.
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:5173,http://127.0.0.1:5173'))),
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-Organization', 'X-Request-Id'],
    'max_age' => 0,
    'supports_credentials' => true,
];
