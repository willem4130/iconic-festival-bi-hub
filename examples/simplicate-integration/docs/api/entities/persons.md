# Persons Entity

**Endpoint**: `/crm/person`

**Operations**: GET, POST, PUT, DELETE

## Basic Information

| Field Name             | Data Type | Description                     |
| ---------------------- | --------- | ------------------------------- |
| id                     | string    | Unique identifier               |
| full_name              | string    | Full name (computed)            |
| first_name             | string    | First name                      |
| family_name            | string    | Family/last name                |
| family_name_prefix     | string    | Name prefix (e.g., "van", "de") |
| initials               | string    | Initials                        |
| gender                 | string    | Gender                          |
| gender_id              | string    | Gender ID                       |
| date_of_birth          | string    | Date of birth                   |
| social_security_number | string    | SSN / BSN                       |
| simplicate_url         | string    | URL in Simplicate               |
| created_at             | string    | Creation timestamp              |
| updated_at             | string    | Last update timestamp           |

## Avatar Fields

| Field Name       | Data Type | Description             |
| ---------------- | --------- | ----------------------- |
| avatar_initials  | string    | Avatar initials         |
| avatar_color     | string    | Avatar background color |
| avatar_url_small | string    | Small avatar URL        |
| avatar_url_large | string    | Large avatar URL        |

## Contact Information

| Field Name             | Data Type | Description        |
| ---------------------- | --------- | ------------------ |
| email                  | string    | Personal email     |
| phone                  | string    | Personal phone     |
| work_email             | string    | Work email         |
| work_phone             | string    | Work phone         |
| work_mobile            | string    | Work mobile        |
| mailing_list_email     | string    | Mailing list email |
| timeline_email_address | string    | Timeline email     |

## Address Fields

| Field Name           | Data Type | Description             |
| -------------------- | --------- | ----------------------- |
| address_id           | string    | Address ID              |
| address_line_1       | string    | Street address line 1   |
| address_line_2       | string    | Street address line 2   |
| address_locality     | string    | City                    |
| address_postal_code  | string    | Postal code             |
| address_province     | string    | Province/State          |
| address_country      | string    | Country name            |
| address_country_id   | string    | Country ID              |
| address_country_code | string    | Country code (e.g., NL) |
| address_type         | string    | Address type            |

## Bank Information

| Field Name   | Data Type | Description           |
| ------------ | --------- | --------------------- |
| bank_account | string    | IBAN / Account number |
| bank_bic     | string    | BIC / SWIFT code      |

## Invoicing

| Field Name       | Data Type | Description              |
| ---------------- | --------- | ------------------------ |
| invoice_receiver | string    | Invoice receiver setting |

## Social Media

| Field Name   | Data Type | Description          |
| ------------ | --------- | -------------------- |
| facebook_url | string    | Facebook profile URL |
| linkedin_url | string    | LinkedIn profile URL |
| twitter_url  | string    | Twitter profile URL  |
| website_url  | string    | Personal website URL |

## Other Fields

| Field Name | Data Type | Description |
| ---------- | --------- | ----------- |
| note       | string    | Notes       |

## Relation Manager Fields

| Field Name                           | Data Type | Description          |
| ------------------------------------ | --------- | -------------------- |
| relation_manager_id                  | string    | Account manager ID   |
| relation_manager_name                | string    | Account manager name |
| relation_manager_function            | string    | Manager function     |
| relation_manager_hourly_cost_tariff  | float     | Manager cost rate    |
| relation_manager_hourly_sales_tariff | float     | Manager sales rate   |

## Example Request

```bash
# Get all persons
curl -X GET "https://domain.simplicate.nl/api/v2/crm/person" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Search by name
curl -X GET "https://domain.simplicate.nl/api/v2/crm/person?q[full_name]=*John*" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Search by email
curl -X GET "https://domain.simplicate.nl/api/v2/crm/person?q[email]=john@example.com" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get persons with specific fields
curl -X GET "https://domain.simplicate.nl/api/v2/crm/person?select=id,full_name,email,work_email,phone" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Create person
curl -X POST "https://domain.simplicate.nl/api/v2/crm/person" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "family_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+31 6 12345678",
    "work_email": "j.doe@company.com",
    "address": {
      "line_1": "Street Name 123",
      "locality": "Amsterdam",
      "postal_code": "1012 AB",
      "country": "NL"
    }
  }'

# Update person
curl -X PUT "https://domain.simplicate.nl/api/v2/crm/person/person:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+31 6 98765432"
  }'
```

## Example Response

```json
{
  "data": [
    {
      "id": "person:abc123",
      "full_name": "John Doe",
      "first_name": "John",
      "family_name": "Doe",
      "initials": "J.",
      "email": "john.doe@example.com",
      "phone": "+31 6 12345678",
      "work_email": "j.doe@company.com",
      "work_phone": "+31 20 123 4567",
      "work_mobile": "+31 6 12345678",
      "gender": "male",
      "avatar": {
        "initials": "JD",
        "color": "#3498db",
        "url_small": "https://...",
        "url_large": "https://..."
      },
      "address": {
        "id": "address:xyz789",
        "line_1": "Street Name 123",
        "locality": "Amsterdam",
        "postal_code": "1012 AB",
        "country": "Netherlands",
        "country_code": "NL"
      },
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "relation_manager": {
        "id": "employee:emp123",
        "name": "Jane Smith"
      }
    }
  ]
}
```

## Linking to Organizations

Persons can be linked to organizations as contact persons:

```bash
# Create contact person link
curl -X POST "https://domain.simplicate.nl/api/v2/crm/contactperson" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "person_id": "person:abc123",
    "organization_id": "organization:xyz789",
    "is_active": true,
    "work_function": "CEO"
  }'
```

## Notes

- Use `work_email` for business communication
- `full_name` is computed from first_name + family_name_prefix + family_name
- Persons can be linked to multiple organizations
- Merge duplicate persons via `/crm/mergeperson`
- Person records can be linked to Employee records for internal staff
