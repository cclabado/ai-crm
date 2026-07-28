# API v1

All endpoints are under `/api/v1`, accept JSON, and use Sanctum session authentication. Obtain `/sanctum/csrf-cookie` before login. Organization routes require the `X-Organization: <organization-public-id>` header.

## Authentication and identity

`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `PATCH /profile`, `PUT /profile/password`, `GET /organizations`, `POST /organizations/switch`, `GET /users`, `PATCH /users/{id}`, `GET|POST /roles`, `PUT /roles/{id}`, `POST /invitations`, `POST /invitations/accept`.

## CRM

- `GET|POST /leads`; `GET|PATCH|DELETE /leads/{id}`; options, bulk update, restore
- `GET|POST /deals`; `GET|PATCH|DELETE /deals/{id}`; `/deals/pipeline`, `/deals/options`, `PATCH /deals/{id}/stage`
- Standard list/create/show/update/delete endpoints: `/companies`, `/contacts`, `/tasks`, `/products`, `/quotations`, `/invoices`, `/tickets`, `/documents`
- `POST /contacts/import` accepts a CSV file (maximum 5 MB/5,000 rows); `GET /contacts/export` downloads CSV
- `GET /engagement/{lead|company|contact|deal|ticket}/{id}` and nested note, attachment, tag, and attachment-download endpoints
- `GET|POST /tickets/{id}/messages` for public replies and internal notes
- `GET /quotations/{id}/pdf` and `GET /invoices/{id}/pdf`
- List endpoints accept `search`, `status`, and `per_page`; lead/deal endpoints add module-specific filters.

## Analytics and administration

`GET /search?q=...`, `GET /dashboard`, `GET /reports`, `GET /reports/export?type=leads|deals|tasks`, `GET|PUT /settings`, `PUT /settings/ai`, `PUT /settings/email`, `PUT /settings/notifications`, `PUT /settings/catalog/{lead-sources|lead-statuses|pipeline-stages}`, `POST /ai/generate`, `GET /notifications`, `PATCH /notifications/{id}/read`, `GET /activities`, `GET /email/threads`, `GET /email/threads/{id}`, `POST /email/send`.

Attachments and contact imports use `multipart/form-data`; PDF/CSV/download endpoints return binary streams. All other mutations accept JSON. Email responses initially report `queued`; the queue worker updates delivery state to `sent` or `failed`.

Successful single-resource responses use `{ "data": ... }`; mutations may include `message`. Collections use Laravel pagination (`data`, `links`, `meta`). Validation failures use HTTP 422, unauthenticated 401, unauthorized 403, missing 404, and throttling 429.
