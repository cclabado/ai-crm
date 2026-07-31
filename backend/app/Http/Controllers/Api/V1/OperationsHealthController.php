<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OperationsHealthController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.view'), 403);
        $database = true;
        try {
            DB::select('select 1');
        } catch (\Throwable) {
            $database = false;
        }

        return response()->json(['data' => [
            'database' => ['ok' => $database],
            'queue' => ['ok' => config('queue.default') !== null, 'driver' => config('queue.default')],
            'storage' => ['ok' => is_writable(storage_path('app'))],
            'scheduler' => ['ok' => true, 'configured' => true],
        ]]);
    }
}
