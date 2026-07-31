# Production Operations Runbook

This runbook covers the infrastructure tasks that must be configured for a production deployment. The application exposes `GET /api/v1/health/operations` for authenticated administrators, but infrastructure credentials and backup destinations remain environment-specific.

## Release checklist

1. Set `APP_ENV=production`, `APP_DEBUG=false`, a unique `APP_KEY`, HTTPS `APP_URL`, and explicit `CORS_ALLOWED_ORIGINS`.
2. Configure managed MySQL, SMTP, private attachment storage, and secret injection through the hosting provider.
3. Run `php artisan migrate --force` during a controlled release.
4. Start a long-running queue worker: `php artisan queue:work --tries=3 --sleep=3 --timeout=120`.
5. Run the scheduler every minute: `php artisan schedule:run`.
6. Run backend and frontend quality checks before promotion.

## Backups

- Schedule daily encrypted MySQL logical backups and retain at least 30 days.
- Keep at least one copy in a separate region/account from the application host.
- Test a restore at least monthly and record the recovery time and recovery point.
- Back up the private attachment disk or use durable object storage with versioning.
- Never store database dumps, SMTP credentials, AI keys, or `.env` files in Git.

Example MySQL backup command (run by the deployment platform, not the web process):

```bash
mysqldump --single-transaction --routines --triggers "$DB_DATABASE" | gzip > "crm-$(date +%F).sql.gz"
```

## Logging and monitoring

- Forward Laravel logs, queue failures, web-server logs, and database metrics to a centralized service.
- Alert on repeated queue failures, HTTP 5xx spikes, failed SMTP deliveries, low disk space, and database connection errors.
- Protect logs from containing passwords, API keys, authorization headers, or full customer attachments.
- Keep audit logs immutable to application users and retain them according to the organization's policy.

## File security

- Keep attachments on a private disk; downloads must go through the authenticated API.
- Add malware scanning at the object-storage or upload boundary before allowing files to be downloaded.
- Enforce the existing MIME, extension, size, and checksum validation.
- Use a durable object store for production and configure lifecycle rules for abandoned files.

## Health checks

- `GET /up` verifies the Laravel process responds.
- `GET /api/v1/health/operations` reports database, queue driver, storage, and scheduler configuration to authorized administrators.
- The health endpoint does not prove that an external SMTP provider or scheduler process is reachable; use provider-level checks and a monitored test email for those dependencies.

