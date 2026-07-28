<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Note;
use App\Models\SupportTicket;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EngagementController extends Controller
{
    public function show(Request $request, string $type, string $record): JsonResponse
    {
        [$model, $permission] = $this->resolve($type, $record);
        abort_unless($request->user()->can($permission.'.view'), 403);

        return response()->json(['data' => [
            'notes' => Note::query()->where('noteable_type', $model::class)->where('noteable_id', $model->getKey())->latest()->get(),
            'activities' => Activity::query()->with('actor:id,public_id,name')->where('subject_type', $model::class)->where('subject_id', $model->getKey())->latest('occurred_at')->limit(100)->get(),
            'attachments' => Attachment::query()->where('attachable_type', $model::class)->where('attachable_id', $model->getKey())->latest()->get(['public_id', 'original_name', 'mime_type', 'size', 'created_at']),
            'tags' => Tag::query()->whereIn('id', DB::table('taggables')->where('taggable_type', $model::class)->where('taggable_id', $model->getKey())->pluck('tag_id'))->orderBy('name')->get(['id', 'name', 'color']),
        ]]);
    }

    public function note(Request $request, string $type, string $record): JsonResponse
    {
        [$model, $permission] = $this->resolve($type, $record);
        $this->authorizeChange($request, $permission);
        $data = $request->validate(['body' => 'required|string|max:50000', 'is_private' => 'sometimes|boolean']);
        $note = Note::query()->create([...$data, 'created_by' => $request->user()->getKey(), 'noteable_type' => $model::class, 'noteable_id' => $model->getKey()]);
        Activity::query()->create(['actor_id' => $request->user()->getKey(), 'subject_type' => $model::class, 'subject_id' => $model->getKey(), 'type' => 'note.created', 'title' => 'Note added', 'occurred_at' => now()]);

        return response()->json(['data' => $note, 'message' => 'Note added successfully.'], 201);
    }

    public function attachment(Request $request, string $type, string $record): JsonResponse
    {
        [$model, $permission] = $this->resolve($type, $record);
        $this->authorizeChange($request, $permission);
        $data = $request->validate(['file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,csv,txt,png,jpg,jpeg']);
        $file = $data['file'];
        $path = $file->store('crm-attachments', 'local');
        $attachment = Attachment::query()->create(['uploaded_by' => $request->user()->getKey(), 'attachable_type' => $model::class, 'attachable_id' => $model->getKey(), 'disk' => 'local', 'path' => $path, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'checksum' => hash_file('sha256', $file->getRealPath())]);
        Activity::query()->create(['actor_id' => $request->user()->getKey(), 'subject_type' => $model::class, 'subject_id' => $model->getKey(), 'type' => 'file.uploaded', 'title' => 'File uploaded', 'description' => $attachment->original_name, 'occurred_at' => now()]);

        return response()->json(['data' => $attachment, 'message' => 'File uploaded successfully.'], 201);
    }

    public function tags(Request $request, string $type, string $record): JsonResponse
    {
        [$model, $permission] = $this->resolve($type, $record);
        $this->authorizeChange($request, $permission);
        $names = $request->validate(['tags' => 'present|array|max:20', 'tags.*' => 'required|string|max:50'])['tags'];
        $tagIds = collect($names)->map(fn (string $name) => Tag::query()->firstOrCreate(['name' => trim($name)])->getKey())->all();
        DB::table('taggables')->where('taggable_type', $model::class)->where('taggable_id', $model->getKey())->delete();
        foreach ($tagIds as $tagId) {
            DB::table('taggables')->insert(['tag_id' => $tagId, 'taggable_type' => $model::class, 'taggable_id' => $model->getKey()]);
        }

        return response()->json(['data' => Tag::query()->whereIn('id', $tagIds)->get()]);
    }

    public function download(Request $request, string $type, string $record, string $attachment): StreamedResponse
    {
        [$model, $permission] = $this->resolve($type, $record);
        abort_unless($request->user()->can($permission.'.view'), 403);
        $file = Attachment::query()->where('attachable_type', $model::class)->where('attachable_id', $model->getKey())->where('public_id', $attachment)->firstOrFail();

        return Storage::disk($file->disk)->download($file->path, $file->original_name);
    }

    private function resolve(string $type, string $publicId): array
    {
        [$class, $permission] = match ($type) {
            'lead' => [Lead::class, 'leads'], 'company' => [Company::class, 'companies'], 'contact' => [Contact::class, 'contacts'],
            'deal' => [Deal::class, 'deals'], 'ticket' => [SupportTicket::class, 'tickets'], default => abort(404),
        };

        return [$class::query()->where('public_id', $publicId)->firstOrFail(), $permission];
    }

    private function authorizeChange(Request $request, string $permission): void
    {
        abort_unless($request->user()->can($permission.'.update') || $request->user()->can($permission.'.manage'), 403);
    }
}
