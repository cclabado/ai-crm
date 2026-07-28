<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Support\Tenancy\CurrentOrganization;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InvoicePdfController extends Controller
{
    public function __invoke(Request $request, string $invoice, CurrentOrganization $current): Response
    {
        abort_unless($request->user()->can('invoices.view'), 403);
        $record = Invoice::query()->with('items')->where('public_id', $invoice)->firstOrFail();

        return Pdf::loadView('pdf.invoice', ['invoice' => $record, 'organization' => $current->get()])
            ->setPaper('a4')->download("invoice-{$record->number}.pdf");
    }
}
