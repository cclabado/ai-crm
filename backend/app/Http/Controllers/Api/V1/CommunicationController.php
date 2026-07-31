<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendCrmEmail;
use App\Models\Activity;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CommunicationController extends Controller
{
    public function activities(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('activities.view'), 403);
        $records = Activity::query()->with('actor:id,public_id,name')->when($request->string('type')->toString(), fn ($query, string $type) => $query->where('type', $type))->latest('occurred_at')->paginate(30);

        return response()->json($records);
    }

    public function emailThreads(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('email.view'), 403);
        $threads = EmailThread::query()->with(['messages' => fn ($query) => $query->latest()->limit(1)])->when($request->string('search')->toString(), fn ($query, string $search) => $query->where('subject', 'like', "%{$search}%"))->latest('last_message_at')->paginate(30);

        return response()->json($threads);
    }

    public function emailThread(Request $request, string $thread): JsonResponse
    {
        abort_unless($request->user()->can('email.view'), 403);

        return response()->json(['data' => EmailThread::query()->with('messages')->where('public_id', $thread)->firstOrFail()]);
    }

    public function sendEmail(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('email.send'), 403);
        $data = $request->validate(['subject' => 'required|string|max:255', 'to' => 'required|array|min:1|max:20', 'to.*' => 'required|email', 'cc' => 'nullable|array|max:20', 'cc.*' => 'email', 'body' => 'required|string|max:50000']);

        $thread = DB::transaction(function () use ($data, $request): EmailThread {
            $thread = EmailThread::query()->create(['owner_id' => $request->user()->getKey(), 'subject' => $data['subject'], 'last_message_at' => now()]);
            $message = EmailMessage::query()->create(['email_thread_id' => $thread->getKey(), 'user_id' => $request->user()->getKey(), 'direction' => 'outbound', 'from_address' => $request->user()->email, 'to_addresses' => $data['to'], 'cc_addresses' => $data['cc'] ?? null, 'body_text' => $data['body'], 'status' => 'queued']);
            SendCrmEmail::dispatch($message->getKey(), $thread->organization_id, $data['subject'])->afterCommit();

            return $thread->load('messages');
        });

        return response()->json(['data' => $thread, 'message' => 'Email queued for delivery.'], Response::HTTP_CREATED);
    }

    public function retryEmail(Request $request, string $message): JsonResponse
    {
        abort_unless($request->user()->can('email.send'), 403);
        $email = EmailMessage::query()->where('public_id', $message)->where('status', 'failed')->firstOrFail();
        $email->update(['status' => 'queued']);
        SendCrmEmail::dispatch($email->getKey(), $email->thread->organization_id, $email->thread->subject)->afterCommit();

        return response()->json(['data' => ['status' => 'queued'], 'message' => 'Email queued for retry.']);
    }
}
