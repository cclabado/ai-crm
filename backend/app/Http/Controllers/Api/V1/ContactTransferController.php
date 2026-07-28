<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactTransferController extends Controller
{
    private const COLUMNS = ['first_name', 'last_name', 'job_title', 'email', 'phone', 'mobile', 'status', 'preferred_channel', 'description'];

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('contacts.view'), 403);

        return response()->streamDownload(function (): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, self::COLUMNS);
            Contact::query()->orderBy('id')->chunk(500, function ($contacts) use ($output): void {
                foreach ($contacts as $contact) {
                    fputcsv($output, collect(self::COLUMNS)->map(fn (string $column) => $contact->{$column})->all());
                }
            });
            fclose($output);
        }, 'contacts-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('contacts.create'), 403);
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $headers = array_map(fn ($value) => strtolower(trim((string) $value)), fgetcsv($handle) ?: []);
        abort_unless(in_array('first_name', $headers, true), 422, 'The CSV must contain a first_name column.');
        abort_if(count(array_diff($headers, self::COLUMNS)) > 0, 422, 'The CSV contains unsupported columns.');

        $created = 0;
        $failed = [];
        DB::transaction(function () use ($handle, $headers, &$created, &$failed): void {
            for ($line = 2; ($row = fgetcsv($handle)) !== false; $line++) {
                if ($line > 5002) {
                    $failed[] = ['row' => $line, 'message' => 'The 5,000 row import limit was reached.'];
                    break;
                }
                $values = array_pad($row, count($headers), null);
                $data = array_combine($headers, array_slice($values, 0, count($headers)));
                $validator = Validator::make($data, [
                    'first_name' => 'required|string|max:120', 'last_name' => 'nullable|string|max:120',
                    'email' => 'nullable|email|max:255', 'status' => 'nullable|in:active,inactive',
                    'preferred_channel' => 'nullable|in:email,phone,mobile',
                ]);
                if ($validator->fails()) {
                    $failed[] = ['row' => $line, 'message' => $validator->errors()->first()];

                    continue;
                }
                Contact::query()->create([...collect($data)->only(self::COLUMNS)->all(), 'status' => $data['status'] ?: 'active']);
                $created++;
            }
        });
        fclose($handle);

        return response()->json(['data' => ['created' => $created, 'failed' => count($failed), 'errors' => array_slice($failed, 0, 25)], 'message' => "Imported {$created} contacts."]);
    }
}
