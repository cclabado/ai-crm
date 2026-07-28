<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = trim($request->validate(['q' => 'required|string|min:2|max:120'])['q']);
        $limit = 5;

        return response()->json(['data' => [
            ...($request->user()->can('leads.view') ? Lead::query()->where(fn ($builder) => $builder->where('first_name', 'like', "%{$query}%")->orWhere('last_name', 'like', "%{$query}%")->orWhere('company_name', 'like', "%{$query}%")->orWhere('email', 'like', "%{$query}%"))->limit($limit)->get()->map(fn (Lead $lead) => ['id' => $lead->public_id, 'type' => 'lead', 'title' => trim("{$lead->first_name} {$lead->last_name}"), 'subtitle' => $lead->company_name ?? $lead->email, 'url' => '/leads'])->all() : []),
            ...($request->user()->can('companies.view') ? Company::query()->where(fn ($builder) => $builder->where('name', 'like', "%{$query}%")->orWhere('email', 'like', "%{$query}%"))->limit($limit)->get()->map(fn (Company $company) => ['id' => $company->public_id, 'type' => 'company', 'title' => $company->name, 'subtitle' => $company->industry, 'url' => '/companies'])->all() : []),
            ...($request->user()->can('contacts.view') ? Contact::query()->where(fn ($builder) => $builder->where('first_name', 'like', "%{$query}%")->orWhere('last_name', 'like', "%{$query}%")->orWhere('email', 'like', "%{$query}%"))->limit($limit)->get()->map(fn (Contact $contact) => ['id' => $contact->public_id, 'type' => 'contact', 'title' => trim("{$contact->first_name} {$contact->last_name}"), 'subtitle' => $contact->email, 'url' => '/contacts'])->all() : []),
            ...($request->user()->can('deals.view') ? Deal::query()->where('name', 'like', "%{$query}%")->limit($limit)->get()->map(fn (Deal $deal) => ['id' => $deal->public_id, 'type' => 'deal', 'title' => $deal->name, 'subtitle' => $deal->currency.' '.number_format((float) $deal->value, 2), 'url' => '/pipeline'])->all() : []),
            ...($request->user()->can('tickets.view') ? SupportTicket::query()->where(fn ($builder) => $builder->where('number', 'like', "%{$query}%")->orWhere('subject', 'like', "%{$query}%"))->limit($limit)->get()->map(fn (SupportTicket $ticket) => ['id' => $ticket->public_id, 'type' => 'ticket', 'title' => $ticket->subject, 'subtitle' => $ticket->number, 'url' => '/support'])->all() : []),
        ]]);
    }
}
