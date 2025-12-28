# Employees Entity

**Endpoint**: `/hrm/employee`

**Operations**: GET, POST, PUT (limited DELETE support)

## Core Fields

| Field Name        | Data Type | Description           |
| ----------------- | --------- | --------------------- |
| id                | string    | Unique identifier     |
| name              | string    | Employee name         |
| function          | string    | Job function/title    |
| employment_status | string    | Employment status     |
| is_user           | boolean   | Is system user        |
| created_at        | string    | Creation timestamp    |
| updated_at        | string    | Last update timestamp |
| modified          | string    | Modified (legacy)     |

## Contact Information

| Field Name  | Data Type | Description        |
| ----------- | --------- | ------------------ |
| work_email  | string    | Work email address |
| work_phone  | string    | Work phone number  |
| work_mobile | string    | Work mobile number |

## Financial Fields

| Field Name          | Data Type | Description         |
| ------------------- | --------- | ------------------- |
| hourly_cost_tariff  | float     | Hourly cost rate    |
| hourly_sales_tariff | float     | Hourly sales rate   |
| bank_account        | string    | Bank account number |

## Personal Information

| Field Name             | Data Type | Description           |
| ---------------------- | --------- | --------------------- |
| civil_status           | string    | Marital status        |
| social_security_number | string    | Social security / BSN |

## Avatar Fields

| Field Name       | Data Type | Description             |
| ---------------- | --------- | ----------------------- |
| avatar_initials  | string    | Avatar initials         |
| avatar_color     | string    | Avatar background color |
| avatar_url_small | string    | Small avatar URL        |
| avatar_url_large | string    | Large avatar URL        |

## Status Fields

| Field Name   | Data Type | Description                    |
| ------------ | --------- | ------------------------------ |
| status_id    | string    | Status ID                      |
| status_label | string    | Status label (active/inactive) |
| type_id      | string    | Employee type ID               |
| type_label   | string    | Employee type label            |

## Linked Person Fields

Employees are linked to a Person record for full contact details:

| Field Name         | Data Type | Description      |
| ------------------ | --------- | ---------------- |
| person_id          | string    | Linked person ID |
| person.id          | string    | Person ID        |
| person.full_name   | string    | Person full name |
| person.first_name  | string    | First name       |
| person.family_name | string    | Family name      |
| person.email       | string    | Personal email   |
| person.phone       | string    | Personal phone   |

## Relation Manager Fields

| Field Name                           | Data Type | Description           |
| ------------------------------------ | --------- | --------------------- |
| relation_manager_id                  | string    | Relation manager ID   |
| relation_manager_name                | string    | Relation manager name |
| relation_manager_function            | string    | RM function           |
| relation_manager_hourly_cost_tariff  | float     | RM cost rate          |
| relation_manager_hourly_sales_tariff | float     | RM sales rate         |

## Example Request

```bash
# Get all employees
curl -X GET "https://domain.simplicate.nl/api/v2/hrm/employee" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get active employees only
curl -X GET "https://domain.simplicate.nl/api/v2/hrm/employee?q[status.label]=active" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get specific employee
curl -X GET "https://domain.simplicate.nl/api/v2/hrm/employee/employee:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get employees with specific fields
curl -X GET "https://domain.simplicate.nl/api/v2/hrm/employee?select=id,name,work_email,function" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"
```

## Example Response

```json
{
  "data": [
    {
      "id": "employee:abc123",
      "name": "John Doe",
      "function": "Developer",
      "work_email": "john.doe@company.com",
      "work_phone": "+31 20 123 4567",
      "work_mobile": "+31 6 12345678",
      "employment_status": "active",
      "is_user": true,
      "hourly_cost_tariff": 50.0,
      "hourly_sales_tariff": 125.0,
      "status": {
        "id": "employeestatus:active",
        "label": "Active"
      },
      "type": {
        "id": "employeetype:internal",
        "label": "Internal"
      },
      "avatar": {
        "initials": "JD",
        "color": "#3498db",
        "url_small": "https://...",
        "url_large": "https://..."
      },
      "person": {
        "id": "person:xyz789",
        "full_name": "John Doe"
      }
    }
  ]
}
```

## Notes

- Use `work_email` field for the employee's work email address
- The `person` relationship contains personal contact details
- Employee records are typically linked to a Person record
- Some employees may also be system users (`is_user: true`)
- Use status filtering to exclude inactive employees
