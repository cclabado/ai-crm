<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Modules\ModuleRegistry;
use App\Services\Modules\ModuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ModuleController extends Controller
{
    public function index(Request $request, ModuleService $service, ModuleRegistry $registry): JsonResponse
    {
        $module = $this->module($request);
        $this->check($request, $registry->get($module)['permission'].'.view');

        return response()->json($service->paginate($module, $request->only(['search', 'status', 'date_from', 'date_to', 'per_page'])));
    }

    public function store(Request $request, ModuleService $service, ModuleRegistry $registry): JsonResponse
    {
        $module = $this->module($request);
        $config = $registry->get($module);
        $this->check($request, $config['permission'].(in_array($module, ['products', 'quotations', 'invoices', 'tickets', 'documents'], true) ? '.manage' : '.create'));
        $data = $request->validate($config['rules']);

        return response()->json(['data' => $service->save($module, $data, null, $request->user()->getKey()), 'message' => 'Created successfully.'], Response::HTTP_CREATED);
    }

    public function show(Request $request, string $record, ModuleService $service, ModuleRegistry $registry): JsonResponse
    {
        $module = $this->module($request);
        $this->check($request, $registry->get($module)['permission'].'.view');

        return response()->json(['data' => $service->find($module, $record)]);
    }

    public function update(Request $request, string $record, ModuleService $service, ModuleRegistry $registry): JsonResponse
    {
        $module = $this->module($request);
        $config = $registry->get($module);
        $this->check($request, $config['permission'].(in_array($module, ['products', 'quotations', 'invoices', 'tickets', 'documents'], true) ? '.manage' : '.update'));
        $rules = collect($config['rules'])->map(fn ($rule) => is_string($rule) ? str_replace('required', 'sometimes|required', $rule) : $rule)->all();
        $data = $request->validate($rules);

        return response()->json(['data' => $service->save($module, $data, $service->find($module, $record), $request->user()->getKey()), 'message' => 'Updated successfully.']);
    }

    public function destroy(Request $request, string $record, ModuleService $service, ModuleRegistry $registry): Response
    {
        $module = $this->module($request);
        $config = $registry->get($module);
        $this->check($request, $config['permission'].(in_array($module, ['products', 'quotations', 'invoices', 'tickets', 'documents'], true) ? '.manage' : '.delete'));
        $service->delete($service->find($module, $record));

        return response()->noContent();
    }

    private function module(Request $request): string
    {
        return (string) $request->route('module');
    }

    private function check(Request $request, string $permission): void
    {
        abort_unless($request->user()->can($permission), 403);
    }
}
