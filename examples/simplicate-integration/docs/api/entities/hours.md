# Hours Entity

**Endpoint**: `/hours/hours`

**Operations**: GET, POST, PUT, DELETE

## Core Fields

| Field Name      | Data Type | Description           |
| --------------- | --------- | --------------------- |
| id              | string    | Unique identifier     |
| hours           | float     | Number of hours       |
| start_date      | string    | Start date/time       |
| end_date        | string    | End date/time         |
| is_time_defined | boolean   | Has specific time     |
| note            | string    | Description/notes     |
| billable        | boolean   | Is billable           |
| locked          | boolean   | Is locked for editing |
| source          | string    | Entry source          |
| status          | string    | Hours status          |
| tariff          | float     | Hourly tariff         |
| created_at      | string    | Creation timestamp    |
| updated_at      | string    | Last update timestamp |

## Employee Fields

| Field Name           | Data Type | Description                |
| -------------------- | --------- | -------------------------- |
| employee_id          | string    | Employee ID                |
| employee_name        | string    | Employee name              |
| employee_employee_id | string    | Employee's employee ID     |
| employee_person_id   | string    | Employee's person ID       |
| employee_tariff      | float     | Employee tariff            |
| employee_amount      | float     | Employee amount            |
| employee_declarable  | string    | Employee declarable status |

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

## Project Service Fields

| Field Name                        | Data Type | Description        |
| --------------------------------- | --------- | ------------------ |
| projectservice_id                 | string    | Service ID         |
| projectservice_name               | string    | Service name       |
| projectservice_default_service_id | string    | Default service ID |
| projectservice_revenue_group_id   | string    | Revenue group ID   |

## Hours Type Fields

| Field Name        | Data Type | Description         |
| ----------------- | --------- | ------------------- |
| type_id           | string    | Hours type ID       |
| type_label        | string    | Hours type label    |
| type_type         | string    | Type classification |
| type_color        | string    | Type color code     |
| type_billable     | float     | Type billable rate  |
| type_tariff       | float     | Type tariff         |
| type_blocked      | boolean   | Type is blocked     |
| type_has_workflow | boolean   | Type has workflow   |

## VAT Class Fields (via Type)

| Field Name               | Data Type | Description     |
| ------------------------ | --------- | --------------- |
| type_vatclass_id         | string    | VAT class ID    |
| type_vatclass_code       | string    | VAT class code  |
| type_vatclass_label      | string    | VAT class label |
| type_vatclass_name       | string    | VAT class name  |
| type_vatclass_percentage | float     | VAT percentage  |

## Approval Status Fields

| Field Name                 | Data Type | Description           |
| -------------------------- | --------- | --------------------- |
| approvalstatus_id          | string    | Approval status ID    |
| approvalstatus_label       | string    | Approval status label |
| approvalstatus_description | string    | Status description    |

## Invoice Fields

| Field Name     | Data Type | Description     |
| -------------- | --------- | --------------- |
| invoice_id     | string    | Invoice ID      |
| invoice_status | string    | Invoice status  |
| invoiceline_id | string    | Invoice line ID |

## Absence/Leave Fields

| Field Name         | Data Type | Description        |
| ------------------ | --------- | ------------------ |
| absence_id         | string    | Absence ID         |
| leave_id           | string    | Leave ID           |
| leave_status_id    | string    | Leave status ID    |
| leave_status_label | string    | Leave status label |

## Assignment Fields

| Field Name    | Data Type | Description   |
| ------------- | --------- | ------------- |
| assignment_id | string    | Assignment ID |

## Correction Fields

| Field Name                       | Data Type | Description          |
| -------------------------------- | --------- | -------------------- |
| corrections_value                | float     | Correction value     |
| corrections_amount               | float     | Correction amount    |
| corrections_last_correction_date | string    | Last correction date |

## Other Fields

| Field Name                                                       | Data Type | Description                |
| ---------------------------------------------------------------- | --------- | -------------------------- |
| is_external                                                      | boolean   | Is external hours          |
| is_recurring                                                     | boolean   | Is recurring entry         |
| project_separate_invoice_recipient_contact_id                    | string    | Separate recipient contact |
| project_separate_invoice_recipient_is_separate_invoice_recipient | boolean   | Has separate recipient     |
| project_separate_invoice_recipient_organization_id               | string    | Recipient org ID           |
| project_separate_invoice_recipient_person_id                     | string    | Recipient person ID        |

## Example Request

```bash
# Get all hours entries
curl -X GET "https://domain.simplicate.nl/api/v2/hours/hours" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get hours for specific project
curl -X GET "https://domain.simplicate.nl/api/v2/hours/hours?q[project_id]=project:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get hours for date range
curl -X GET "https://domain.simplicate.nl/api/v2/hours/hours?q[start_date][ge]=2024-01-01&q[start_date][le]=2024-01-31" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Create hours entry
curl -X POST "https://domain.simplicate.nl/api/v2/hours/hours" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "employee:abc123",
    "project_id": "project:xyz789",
    "projectservice_id": "service:def456",
    "hours": 8.0,
    "start_date": "2024-01-15",
    "note": "Development work"
  }'
```

## Example Response

```json
{
  "data": [
    {
      "id": "hours:abc123",
      "hours": 8.0,
      "start_date": "2024-01-15",
      "end_date": "2024-01-15",
      "employee": {
        "id": "employee:emp123",
        "name": "John Doe"
      },
      "project": {
        "id": "project:proj123",
        "name": "Website Redesign",
        "project_number": "P2024-001"
      },
      "projectservice": {
        "id": "service:svc123",
        "name": "Development"
      },
      "note": "Development work",
      "billable": true,
      "tariff": 125.0,
      "approvalstatus": {
        "id": "approvalstatus:approved",
        "label": "Approved"
      }
    }
  ]
}
```
