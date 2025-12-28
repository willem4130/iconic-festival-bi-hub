# Organizations Entity

**Endpoint**: `/crm/organization`

**Operations**: GET, POST, PUT, DELETE

## Core Fields

| Field Name     | Data Type | Description           |
| -------------- | --------- | --------------------- |
| id             | string    | Unique identifier     |
| name           | string    | Organization name     |
| email          | string    | Primary email         |
| phone          | string    | Primary phone         |
| url            | string    | Website URL           |
| note           | string    | Notes                 |
| is_active      | boolean   | Is active             |
| simplicate_url | string    | URL in Simplicate     |
| created_at     | string    | Creation timestamp    |
| updated_at     | string    | Last update timestamp |
| created        | string    | Created (legacy)      |
| modified       | string    | Modified (legacy)     |

## Registration & Compliance

| Field Name | Data Type | Description               |
| ---------- | --------- | ------------------------- |
| coc_code   | string    | Chamber of Commerce (KvK) |
| vat_number | string    | VAT number                |

## Bank Information

| Field Name   | Data Type | Description           |
| ------------ | --------- | --------------------- |
| bank_account | string    | IBAN / Account number |
| bank_bic     | string    | BIC / SWIFT code      |

## Postal Address

| Field Name                 | Data Type | Description           |
| -------------------------- | --------- | --------------------- |
| postal_address_id          | string    | Address ID            |
| postal_address_line_1      | string    | Street address line 1 |
| postal_address_line_2      | string    | Street address line 2 |
| postal_address_locality    | string    | City                  |
| postal_address_postal_code | string    | Postal code           |
| postal_address_province    | string    | Province/State        |
| postal_address_country     | string    | Country name          |

## Visiting Address

| Field Name                   | Data Type | Description           |
| ---------------------------- | --------- | --------------------- |
| visiting_address_id          | string    | Address ID            |
| visiting_address_line_1      | string    | Street address line 1 |
| visiting_address_line_2      | string    | Street address line 2 |
| visiting_address_locality    | string    | City                  |
| visiting_address_postal_code | string    | Postal code           |
| visiting_address_country     | string    | Country name          |

## Debtor Settings

| Field Name               | Data Type | Description          |
| ------------------------ | --------- | -------------------- |
| debtor_payment_term_days | int64     | Default payment days |
| debtor_autocollect       | boolean   | Auto-collect enabled |
| debtor_reminders         | boolean   | Send reminders       |
| debtor_provision_method  | string    | Provision method     |

## Relation Management

| Field Name            | Data Type | Description              |
| --------------------- | --------- | ------------------------ |
| relation_number       | string    | Relation/customer number |
| relation_type_id      | string    | Relation type ID         |
| relation_manager_id   | string    | Account manager ID       |
| relation_manager_name | string    | Account manager name     |

## Accountancy Fields

| Field Name                    | Data Type | Description           |
| ----------------------------- | --------- | --------------------- |
| accountancy_is_tax_unit_vat   | boolean   | Is VAT tax unit       |
| accountancy_is_tax_unit_vpb   | boolean   | Is corporate tax unit |
| accountancy_tax_unit_vat_role | string    | VAT tax unit role     |
| accountancy_tax_unit_vpb_role | string    | Corp tax unit role    |
| accountancy_vat_number_fe     | string    | VAT number (foreign)  |

## Example Request

```bash
# Get all organizations
curl -X GET "https://domain.simplicate.nl/api/v2/crm/organization" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Search by name
curl -X GET "https://domain.simplicate.nl/api/v2/crm/organization?q[name]=*Acme*" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Get active organizations only
curl -X GET "https://domain.simplicate.nl/api/v2/crm/organization?q[is_active]=true" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"

# Create organization
curl -X POST "https://domain.simplicate.nl/api/v2/crm/organization" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company BV",
    "email": "info@newcompany.nl",
    "phone": "+31 20 123 4567",
    "coc_code": "12345678",
    "vat_number": "NL123456789B01",
    "visiting_address": {
      "line_1": "Streetname 123",
      "locality": "Amsterdam",
      "postal_code": "1012 AB",
      "country": "NL"
    }
  }'

# Update organization
curl -X PUT "https://domain.simplicate.nl/api/v2/crm/organization/organization:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name"
  }'
```

## Example Response

```json
{
  "data": [
    {
      "id": "organization:abc123",
      "name": "Acme Corporation",
      "email": "info@acme.com",
      "phone": "+31 20 123 4567",
      "url": "https://www.acme.com",
      "coc_code": "12345678",
      "vat_number": "NL123456789B01",
      "is_active": true,
      "relation_number": "C001",
      "visiting_address": {
        "id": "address:xyz789",
        "line_1": "Business Street 100",
        "locality": "Amsterdam",
        "postal_code": "1012 AB",
        "country": "Netherlands"
      },
      "postal_address": {
        "id": "address:xyz790",
        "line_1": "PO Box 123",
        "locality": "Amsterdam",
        "postal_code": "1000 AA",
        "country": "Netherlands"
      },
      "relation_manager": {
        "id": "employee:emp123",
        "name": "John Doe"
      },
      "bank_account": "NL91ABNA0417164300",
      "bank_bic": "ABNANL2A"
    }
  ]
}
```

## Contact Persons

To get contact persons linked to an organization, use the ContactPerson endpoint:

```bash
curl -X GET "https://domain.simplicate.nl/api/v2/crm/contactperson?q[organization_id]=organization:abc123" \
  -H "Authentication-Key: YOUR_API_KEY" \
  -H "Authentication-Secret: YOUR_API_SECRET"
```

## Notes

- Use `is_active` filter to exclude inactive organizations
- Addresses are nested objects with their own IDs
- Link contact persons via the `/crm/contactperson` endpoint
- Merge duplicate organizations via `/crm/mergeorganization`
