<?php

namespace App\Http\Middleware;

use App\Support\Tenancy\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class ResolveOrganization
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $sessionOrganization = $request->hasSession() ? $request->session()->get('current_organization') : null;
        $requestedPublicId = $request->header('X-Organization') ?? $sessionOrganization;

        $organizations = $user->organizations()
            ->wherePivot('status', 'active')
            ->where('organizations.status', 'active');

        $organization = $requestedPublicId
            ? (clone $organizations)->where('organizations.public_id', $requestedPublicId)->first()
            : $organizations->first();

        abort_unless($organization, 403, 'No active organization is available for this request.');

        $this->currentOrganization->set($organization);
        if ($request->hasSession()) {
            $request->session()->put('current_organization', $organization->public_id);
        }
        app(PermissionRegistrar::class)->setPermissionsTeamId($organization->getKey());

        $response = $next($request);
        $response->headers->set('X-Organization', $organization->public_id);

        return $response;
    }
}
