# Invoices Entity

**Endpoint**: `/invoices/invoice`

**Operations**: GET, POST, PUT (limited DELETE support)

## Core Fields

| Field Name             | Data Type | Description           |
| ---------------------- | --------- | --------------------- |
| id                     | string    | Unique identifier     |
| invoice_number         | string    | Invoice number        |
| date                   | string    | Invoice date          |
| subject                | string    | Invoice subject       |
| reference              | string    | Reference text        |
| comments               | string    | Internal comments     |
| composition_type       | string    | Composition type      |
| sending_method         | string    | Sending method        |
| simplicate_url         | string    | URL in Simplicate     |
| timeline_email_address | string    | Timeline email        |
| created_at             | string    | Creation timestamp    |
| updated_at             | string    | Last update timestamp |
| created                | string    | Created (legacy)      |

## Financial Fields

| Field Name          | Data Type | Description        |
| ------------------- | --------- | ------------------ |
| total_excluding_vat | float     | Total excl. VAT    |
| total_including_vat | float     | Total incl. VAT    |
| total_vat           | float     | VAT amount         |
| total_outstanding   | float     | Outstanding amount |

## Status Fields

| Field Name   | Data Type | Description       |
| ------------ | --------- | ----------------- |
| status_id    | string    | Status ID         |
| status_name  | string    | Status name       |
| status_color | string    | Status color code |

## Organization Fields

| Field Name        | Data Type | Description         |
| ----------------- | --------- | ------------------- |
| organization_id   | string    | Organization ID     |
| organization_name | string    | Organization name   |
| person_id         | string    | Contact person ID   |
| person_full_name  | string    | Contact person name |
| contact_id        | string    | Contact ID          |

## Project Fields

| Field Name                | Data Type | Description          |
| ------------------------- | --------- | -------------------- |
| project_id                | string    | Project ID           |
| project_name              | string    | Project name         |
| project_project_number    | string    | Project number       |
| project_organization_id   | string    | Project org ID       |
| project_organization_name | string    | Project org name     |
| project_person_id         | string    | Project contact ID   |
| project_person_full_name  | string    | Project contact name |

## Project Manager Fields (via Project)

| Field Name                          | Data Type | Description    |
| ----------------------------------- | --------- | -------------- |
| project_project_manager_id          | string    | PM ID          |
| project_project_manager_name        | string    | PM name        |
| project_project_manager_employee_id | string    | PM employee ID |
| project_project_manager_person_id   | string    | PM person ID   |
| project_project_manager_tariff      | float     | PM tariff      |
| project_project_manager_amount      | float     | PM amount      |
| project_project_manager_declarable  | string    | PM declarable  |

## Separate Invoice Recipient (via Project)

| Field Name                                                       | Data Type | Description            |
| ---------------------------------------------------------------- | --------- | ---------------------- |
| project_separate_invoice_recipient_contact_id                    | string    | Recipient contact      |
| project_separate_invoice_recipient_is_separate_invoice_recipient | boolean   | Has separate recipient |
| project_separate_invoice_recipient_organization_id               | string    | Recipient org ID       |
| project_separate_invoice_recipient_person_id                     | string    | Recipient person ID    |

## Payment Term Fields

| Field Name          | Data Type | Description       |
| ------------------- | --------- | ----------------- |
| payment_term_id     | string    | Payment term ID   |
| payment_term_name   | string    | Payment term name |
| payment_term_days   | int64     | Payment days      |
| payment_term_method | string    | Payment method    |

## Reminder Fields

| Field Name            | Data Type | Description          |
| --------------------- | --------- | -------------------- |
| reminder_set_id       | string    | Reminder set ID      |
| reminder_set_label    | string    | Reminder set label   |
| reminder_set_disabled | boolean   | Reminders disabled   |
| reminder_paused       | boolean   | Reminders paused     |
| reminder_next_action  | string    | Next reminder action |

## Subscription Fields

| Field Name                     | Data Type | Description        |
| ------------------------------ | --------- | ------------------ |
| subscription_cycle_start_date  | string    | Subscription start |
| subscription_cycle_end_date    | string    | Subscription end   |
| subscription_cycle_is_invoiced | boolean   | Is invoiced        |

## My Organization Profile Fields

| Field Name                                | Data Type | Description      |
| ----------------------------------------- | --------- | ---------------- |
| my_organization_profile_id                | string    | Profile ID       |
| my_organization_profile_organization_id   | string    | Profile org ID   |
| my_organization_profile_organization_name | string    | Profile org name |

## Example Request

```bash
# Get all invoices
curl -X GET "https://domain.simplicate.nl/api/v2/invoices/invoice" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get invoices for specific project
curl -X GET "https://domain.simplicate.nl/api/v2/invoices/invoice?q[project_id]=project:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get unpaid invoices
curl -X GET "https://domain.simplicate.nl/api/v2/invoices/invoice?q[status.name]=open" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Create invoice
curl -X POST "https://domain.simplicate.nl/api/v2/invoices/invoice" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project:abc123",
    "organization_id": "organization:xyz789",
    "date": "2024-01-15",
    "payment_term_id": "paymentterm:30days"
  }'
```

## Example Response

```json
{
  "data": [
    {
      "id": "invoice:abc123",
      "invoice_number": "INV-2024-001",
      "date": "2024-01-15",
      "organization": {
        "id": "organization:xyz789",
        "name": "Acme Corp"
      },
      "project": {
        "id": "project:proj123",
        "name": "Website Redesign",
        "project_number": "P2024-001"
      },
      "status": {
        "id": "invoicestatus:open",
        "name": "Open",
        "color": "#ff9900"
      },
      "total_excluding_vat": 10000.0,
      "total_vat": 2100.0,
      "total_including_vat": 12100.0,
      "total_outstanding": 12100.0,
      "payment_term": {
        "id": "paymentterm:30days",
        "name": "30 days",
        "days": 30
      }
    }
  ]
}
```

## Invoice Statuses

Common invoice statuses:

- Draft
- Open
- Sent
- Partially Paid
- Paid
- Overdue
- Cancelled

## Notes

- Invoice lines are managed separately via `/invoices/invoiceline`
- Some fields are read-only after invoice is sent
- Deletion may be restricted based on status
