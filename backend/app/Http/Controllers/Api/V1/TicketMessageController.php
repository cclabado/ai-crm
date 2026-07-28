<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketMessageController extends Controller
{
    public function index(Request $request, string $ticket): JsonResponse
    {
        abort_unless($request->user()->can('tickets.view'), 403);
        $record = SupportTicket::query()->where('public_id', $ticket)->firstOrFail();

        return response()->json(['data' => $record->messages()->with(['user:id,public_id,name', 'contact:id,public_id,first_name,last_name'])->get()]);
    }

    public function store(Request $request, string $ticket): JsonResponse
    {
        abort_unless($request->user()->can('tickets.manage'), 403);
        $record = SupportTicket::query()->where('public_id', $ticket)->firstOrFail();
        $data = $request->validate(['body' => 'required|string|max:50000', 'is_internal' => 'sometimes|boolean']);
        $message = $record->messages()->create([...$data, 'user_id' => $request->user()->getKey(), 'sent_at' => now()]);
        if (! $record->first_responded_at && ! ($data['is_internal'] ?? false)) {
            $record->update(['first_responded_at' => now(), 'status' => $record->status === 'open' ? 'pending' : $record->status]);
        }
        Activity::query()->create(['actor_id' => $request->user()->getKey(), 'subject_type' => SupportTicket::class, 'subject_id' => $record->getKey(), 'type' => 'ticket.message', 'title' => ($data['is_internal'] ?? false) ? 'Internal reply added' : 'Customer reply recorded', 'occurred_at' => now()]);

        return response()->json(['data' => $message, 'message' => 'Reply added successfully.'], 201);
    }
}
