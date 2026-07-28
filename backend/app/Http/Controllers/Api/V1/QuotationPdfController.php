<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Support\Tenancy\CurrentOrganization;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class QuotationPdfController extends Controller
{
    public function __invoke(Request $request, string $quotation, CurrentOrganization $current): Response
    {
        abort_unless($request->user()->can('quotations.view'), 403);
        $record = Quotation::query()->with('items')->where('public_id', $quotation)->firstOrFail();

        return Pdf::loadView('pdf.quotation', ['quotation' => $record, 'organization' => $current->get()])
            ->setPaper('a4')
            ->download("quotation-{$record->number}.pdf");
    }
}
