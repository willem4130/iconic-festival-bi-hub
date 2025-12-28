# Projects Entity

**Endpoint**: `/projects/project`

**Operations**: GET, POST, PUT, DELETE

## Fields

| Field Name             | Data Type | Description                  |
| ---------------------- | --------- | ---------------------------- |
| id                     | string    | Unique identifier            |
| name                   | string    | Project name                 |
| project_number         | string    | Project number               |
| billable               | boolean   | Is project billable          |
| start_date             | string    | Project start date           |
| end_date               | string    | Project end date             |
| note                   | string    | Project notes                |
| invoice_reference      | string    | Invoice reference text       |
| hours_rate_type        | string    | Hours rate type              |
| is_invoice_approval    | boolean   | Requires invoice approval    |
| is_reverse_billing     | boolean   | Uses reverse billing         |
| simplicate_url         | string    | URL to project in Simplicate |
| timeline_email_address | string    | Timeline email address       |
| created_at             | string    | Creation timestamp           |
| updated_at             | string    | Last update timestamp        |

## Organization Fields

| Field Name                | Data Type | Description               |
| ------------------------- | --------- | ------------------------- |
| organization_id           | string    | Organization ID           |
| organization_name         | string    | Organization name         |
| person_id                 | string    | Contact person ID         |
| person_full_name          | string    | Contact person name       |
| contact_id                | string    | Contact ID                |
| contact_organization_id   | string    | Contact organization ID   |
| contact_organization_name | string    | Contact organization name |
| contact_person_id         | string    | Contact person ID         |
| contact_person_full_name  | string    | Contact person name       |

## Project Manager Fields

| Field Name                  | Data Type | Description          |
| --------------------------- | --------- | -------------------- |
| project_manager_id          | string    | Project manager ID   |
| project_manager_name        | string    | Project manager name |
| project_manager_employee_id | string    | PM employee ID       |
| project_manager_person_id   | string    | PM person ID         |
| project_manager_tariff      | float     | PM hourly rate       |
| project_manager_amount      | float     | PM amount            |
| project_manager_declarable  | string    | PM declarable status |

## Status Fields

| Field Name           | Data Type | Description       |
| -------------------- | --------- | ----------------- |
| project_status_id    | string    | Status ID         |
| project_status_label | string    | Status label      |
| project_status_color | string    | Status color code |

## Budget Fields

| Field Name                  | Data Type | Description          |
| --------------------------- | --------- | -------------------- |
| budget_hours_amount_budget  | float     | Budgeted hours       |
| budget_hours_amount_spent   | float     | Hours spent          |
| budget_hours_value_budget   | float     | Budgeted hours value |
| budget_hours_value_spent    | float     | Hours value spent    |
| budget_costs_value_budget   | float     | Budgeted costs       |
| budget_costs_value_spent    | float     | Costs spent          |
| budget_total_value_budget   | float     | Total budget value   |
| budget_total_value_spent    | float     | Total spent          |
| budget_total_value_invoiced | float     | Total invoiced       |

## Payment Term Fields

| Field Name                    | Data Type | Description       |
| ----------------------------- | --------- | ----------------- |
| divergent_payment_term_id     | string    | Payment term ID   |
| divergent_payment_term_name   | string    | Payment term name |
| divergent_payment_term_days   | int64     | Payment days      |
| divergent_payment_term_method | string    | Payment method    |

## Separate Invoice Recipient Fields

| Field Name                                               | Data Type | Description            |
| -------------------------------------------------------- | --------- | ---------------------- |
| separate_invoice_recipient_is_separate_invoice_recipient | boolean   | Has separate recipient |
| separate_invoice_recipient_organization_id               | string    | Recipient org ID       |
| separate_invoice_recipient_organization_name             | string    | Recipient org name     |
| separate_invoice_recipient_person_id                     | string    | Recipient person ID    |
| separate_invoice_recipient_person_full_name              | string    | Recipient person name  |
| separate_invoice_recipient_contact_id                    | string    | Recipient contact ID   |

## My Organization Profile Fields

| Field Name                                | Data Type | Description      |
| ----------------------------------------- | --------- | ---------------- |
| my_organization_profile_id                | string    | Profile ID       |
| my_organization_profile_organization_id   | string    | Profile org ID   |
| my_organization_profile_organization_name | string    | Profile org name |

## Other Fields

| Field Name               | Data Type | Description                 |
| ------------------------ | --------- | --------------------------- |
| abnormal_address         | boolean   | Has abnormal address        |
| abnormal_contact_id      | string    | Abnormal contact ID         |
| abnormal_organization_id | string    | Abnormal org ID             |
| abnormal_person_id       | string    | Abnormal person ID          |
| can_register_mileage     | boolean   | Allows mileage registration |
| created                  | string    | Created timestamp (legacy)  |
| modified                 | string    | Modified timestamp (legacy) |

## Example Request

```bash
# Get all projects
curl -X GET "https://domain.simplicate.nl/api/v2/projects/project" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get project with specific fields
curl -X GET "https://domain.simplicate.nl/api/v2/projects/project?select=id,name,organization.name,project_manager.name" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Filter by organization
curl -X GET "https://domain.simplicate.nl/api/v2/projects/project?q[organization.name]=*Acme*" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"
```

## Example Response

```json
{
  "data": [
    {
      "id": "project:abc123",
      "name": "Website Redesign",
      "project_number": "P2024-001",
      "organization": {
        "id": "organization:xyz789",
        "name": "Acme Corp"
      },
      "project_manager": {
        "id": "employee:emp123",
        "name": "John Doe"
      },
      "start_date": "2024-01-15",
      "end_date": "2024-06-30",
      "project_status": {
        "id": "projectstatus:active",
        "label": "Active",
        "color": "#00ff00"
      },
      "billable": true
    }
  ]
}
```
