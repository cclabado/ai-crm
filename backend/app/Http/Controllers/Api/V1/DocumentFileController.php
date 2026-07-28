<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentFileController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('documents.manage'), 403);
        $data = $request->validate(['file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,csv,txt,png,jpg,jpeg', 'name' => 'nullable|string|max:255']);
        $file = $data['file'];
        $path = $file->store('crm-documents', 'local');
        $document = Document::query()->create(['uploaded_by' => $request->user()->getKey(), 'type' => 'file', 'name' => $data['name'] ?? $file->getClientOriginalName(), 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'version' => 1]);

        return response()->json(['data' => $document, 'message' => 'Document uploaded securely.'], 201);
    }

    public function download(Request $request, string $document): StreamedResponse
    {
        abort_unless($request->user()->can('documents.view'), 403);
        $record = Document::query()->where('public_id', $document)->firstOrFail();
        abort_if($record->type !== 'file' || blank($record->path) || ! Storage::disk($record->disk ?? 'local')->exists($record->path), 404);

        return Storage::disk($record->disk ?? 'local')->download($record->path, $record->name);
    }
}
