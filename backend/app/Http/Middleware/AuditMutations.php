<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Support\Tenancy\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\Response;

class AuditMutations
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true) && $response->getStatusCode() < 400) {
            AuditLog::query()->create([
                'organization_id' => app(CurrentOrganization::class)->id(),
                'actor_id' => $request->user()?->getKey(),
                'action' => strtolower($request->method()).':'.($request->route()?->getName() ?? $request->path()),
                'after' => Arr::except($request->input(), ['password', 'password_confirmation', 'current_password', 'api_key', 'token']),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'request_id' => $request->header('X-Request-ID'),
                'created_at' => now(),
            ]);
        }

        return $response;
    }
}
