# Database ERD

```mermaid
erDiagram
  USERS }o--o{ ORGANIZATIONS : membership
  ORGANIZATIONS ||--o{ LEADS : owns
  ORGANIZATIONS ||--o{ COMPANIES : owns
  ORGANIZATIONS ||--o{ CONTACTS : owns
  ORGANIZATIONS ||--o{ PIPELINES : owns
  PIPELINES ||--o{ PIPELINE_STAGES : contains
  PIPELINE_STAGES ||--o{ DEALS : contains
  COMPANIES }o--o{ CONTACTS : associates
  DEALS ||--o{ DEAL_STAGE_HISTORY : records
  ORGANIZATIONS ||--o{ TASKS : owns
  ORGANIZATIONS ||--o{ ACTIVITIES : records
  ORGANIZATIONS ||--o{ PRODUCTS : catalogs
  DEALS ||--o{ QUOTATIONS : proposes
  QUOTATIONS ||--|{ QUOTATION_ITEMS : contains
  QUOTATIONS ||--o{ INVOICES : converts
  INVOICES ||--|{ INVOICE_ITEMS : contains
  ORGANIZATIONS ||--o{ SUPPORT_TICKETS : owns
  SUPPORT_TICKETS ||--o{ TICKET_MESSAGES : contains
  ORGANIZATIONS ||--o{ EMAIL_THREADS : owns
  EMAIL_THREADS ||--o{ EMAIL_MESSAGES : contains
  ORGANIZATIONS ||--o{ DOCUMENTS : owns
  ORGANIZATIONS ||--o| AI_CONFIGURATIONS : configures
  ORGANIZATIONS ||--o{ AI_REQUEST_LOGS : audits
  ORGANIZATIONS ||--o{ AUDIT_LOGS : audits
```

Every business table is indexed by organization and its common filter/sort columns. Public ULIDs prevent exposing sequential internal IDs. Foreign keys enforce integrity; recoverable entities use soft deletion.
