<?php

use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CommunicationController;
use App\Http\Controllers\Api\V1\ContactTransferController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DealController;
use App\Http\Controllers\Api\V1\DocumentFileController;
use App\Http\Controllers\Api\V1\EngagementController;
use App\Http\Controllers\Api\V1\GlobalSearchController;
use App\Http\Controllers\Api\V1\InvitationController;
use App\Http\Controllers\Api\V1\InvoicePdfController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\ModuleController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\PasswordController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\QuotationPdfController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\TicketMessageController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:api')->group(function (): void {
    Route::middleware('guest')->post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('guest')->post('/auth/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:login');
    Route::middleware('guest')->post('/auth/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:login');
    Route::middleware('guest')->post('/invitations/accept', [InvitationController::class, 'accept'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::patch('/profile', [ProfileController::class, 'update']);
        Route::put('/profile/password', [ProfileController::class, 'changePassword']);
        Route::get('/organizations', [OrganizationController::class, 'index']);
        Route::post('/organizations/switch', [OrganizationController::class, 'switch']);

        Route::middleware(['organization', 'audit'])->group(function (): void {
            Route::get('/health', fn () => response()->json(['data' => ['status' => 'ok']]));
            Route::get('/search', GlobalSearchController::class);
            Route::get('/dashboard', DashboardController::class);
            Route::get('/users', [UserController::class, 'index']);
            Route::patch('/users/{user}', [UserController::class, 'update']);
            Route::get('/roles', [UserController::class, 'roles']);
            Route::post('/roles', [RoleController::class, 'store']);
            Route::put('/roles/{role}', [RoleController::class, 'update']);
            Route::post('/invitations', [InvitationController::class, 'store']);
            Route::get('/leads/options', [LeadController::class, 'options']);
            Route::post('/leads/bulk-update', [LeadController::class, 'bulkUpdate']);
            Route::post('/leads/{lead}/restore', [LeadController::class, 'restore']);
            Route::apiResource('leads', LeadController::class);
            Route::get('/deals/pipeline', [DealController::class, 'pipeline']);
            Route::get('/deals/options', [DealController::class, 'options']);
            Route::patch('/deals/{deal}/stage', [DealController::class, 'move']);
            Route::apiResource('deals', DealController::class);
            Route::get('/contacts/export', [ContactTransferController::class, 'export']);
            Route::post('/contacts/import', [ContactTransferController::class, 'import']);

            foreach (['companies', 'contacts', 'tasks', 'products', 'quotations', 'invoices', 'tickets', 'documents'] as $module) {
                Route::get("/{$module}", [ModuleController::class, 'index'])->defaults('module', $module);
                Route::post("/{$module}", [ModuleController::class, 'store'])->defaults('module', $module);
                Route::get("/{$module}/{record}", [ModuleController::class, 'show'])->defaults('module', $module);
                Route::patch("/{$module}/{record}", [ModuleController::class, 'update'])->defaults('module', $module);
                Route::delete("/{$module}/{record}", [ModuleController::class, 'destroy'])->defaults('module', $module);
            }

            Route::get('/reports', [ReportController::class, 'index']);
            Route::get('/reports/export', [ReportController::class, 'export']);
            Route::get('/settings', [SettingsController::class, 'show']);
            Route::put('/settings', [SettingsController::class, 'update']);
            Route::post('/settings/logo', [SettingsController::class, 'logo']);
            Route::put('/settings/ai', [SettingsController::class, 'updateAi']);
            Route::put('/settings/catalog/{type}', [SettingsController::class, 'catalog']);
            Route::put('/settings/notifications', [SettingsController::class, 'notificationPreferences']);
            Route::put('/settings/email', [SettingsController::class, 'email']);
            Route::post('/ai/generate', [AiController::class, 'generate'])->middleware('throttle:10,1');
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::patch('/notifications/{notification}/read', [NotificationController::class, 'read']);
            Route::get('/activities', [CommunicationController::class, 'activities']);
            Route::get('/email/threads', [CommunicationController::class, 'emailThreads']);
            Route::get('/email/threads/{thread}', [CommunicationController::class, 'emailThread']);
            Route::post('/email/send', [CommunicationController::class, 'sendEmail']);
            Route::post('/documents/upload', [DocumentFileController::class, 'store']);
            Route::get('/documents/{document}/download', [DocumentFileController::class, 'download']);
            Route::get('/quotations/{quotation}/pdf', QuotationPdfController::class);
            Route::get('/invoices/{invoice}/pdf', InvoicePdfController::class);
            Route::get('/engagement/{type}/{record}', [EngagementController::class, 'show']);
            Route::post('/engagement/{type}/{record}/notes', [EngagementController::class, 'note']);
            Route::post('/engagement/{type}/{record}/attachments', [EngagementController::class, 'attachment']);
            Route::put('/engagement/{type}/{record}/tags', [EngagementController::class, 'tags']);
            Route::get('/engagement/{type}/{record}/attachments/{attachment}', [EngagementController::class, 'download']);
            Route::get('/tickets/{ticket}/messages', [TicketMessageController::class, 'index']);
            Route::post('/tickets/{ticket}/messages', [TicketMessageController::class, 'store']);
        });
    });
});
