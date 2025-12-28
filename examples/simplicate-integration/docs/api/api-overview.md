# Simplicate API Overview

## Authentication

Simplicate uses token-based authentication with API Key and Secret.

### Headers Required

```
Authentication-Key: {API Key}
Authentication-Secret: {API Secret}
Content-Type: application/json
```

### Getting Credentials

1. Go to Simplicate → Settings → General → API
2. Create new API token
3. Copy API Key and API Secret

### Protocol

SSL-only API - all requests must use HTTPS.

## Base URL

```
https://{yourdomain}.simplicate.nl/api/v2/
```

Replace `{yourdomain}` with your Simplicate subdomain.

## Request/Response Format

- **Content-Type**: JSON exclusively
- All responses return JSON with this structure:

```json
{
  "data": [...],     // The actual data
  "errors": null,    // Error messages if any
  "debug": null      // Debug info (if enabled)
}
```

## HTTP Status Codes

| Code | Description                        |
| ---- | ---------------------------------- |
| 200  | Success                            |
| 400  | Bad request / validation error     |
| 401  | Unauthorized (invalid credentials) |
| 403  | Forbidden (no access to resource)  |
| 404  | Resource not found                 |
| 429  | Rate limit exceeded                |
| 500  | Server error                       |
| 503  | Maintenance mode                   |

## Error Response Structure

```json
{
  "data": null,
  "errors": ["Error description"],
  "debug": null
}
```

## Rate Limiting

- **Minimum guaranteed**: 60 requests per minute
- Exceeding the limit returns HTTP 429 Too Many Requests
- Wait and retry with exponential backoff

## Pagination

All list endpoints support pagination:

| Parameter  | Description                 | Default |
| ---------- | --------------------------- | ------- |
| `limit`    | Number of records (max 100) | 100     |
| `offset`   | Skip N records              | 0       |
| `metadata` | Include metadata            | none    |

### Example

```
GET /projects/project?limit=50&offset=100&metadata=count,limit,offset
```

### Metadata Response

```json
{
  "data": [...],
  "metadata": {
    "count": 250,
    "limit": 50,
    "offset": 100
  }
}
```

## Filtering (q parameter)

Filter results using the `q` parameter with field names:

### Basic Filter

```
GET /crm/organization?q[name]=Acme
```

### Wildcards

```
GET /crm/organization?q[name]=*Bob*     // Contains "Bob"
GET /crm/person?q[email]=*@gmail.com    // Ends with "@gmail.com"
```

### NULL Checking

```
GET /projects/project?q[end_date]=null  // Where end_date is null
GET /projects/project?q[end_date]=*     // Where end_date is NOT null
```

### Nested Filtering

```
GET /projects/project?q[organization.name]=Google
```

### Comparison Operators

```
q[created_at][ge]=2024-01-01    // Greater than or equal
q[created_at][gt]=2024-01-01    // Greater than
q[created_at][le]=2024-12-31    // Less than or equal
q[created_at][lt]=2024-12-31    // Less than
```

### IN / NOT IN

```
q[status][in]=active,pending         // Status is "active" OR "pending"
q[status][nin]=closed,cancelled      // Status is NOT "closed" or "cancelled"
```

## Field Selection (select parameter)

Return only specific fields:

```
GET /projects/project?select=id,name,project_number
```

### Nested Selection

```
GET /projects/project?select=id,name,organization.name,project_manager.name
```

## Sorting (sort parameter)

Sort results by field:

```
GET /projects/project?sort=name              // Ascending (default)
GET /projects/project?sort=-created_at       // Descending (prefix with -)
```

## Custom Fields

Filter on custom fields for Projects, Organizations, Persons, and Sales:

```
GET /projects/project?q[custom_fields.my_field_name]=value
```

## API Limitations

1. **Invoice Methods**: Only FixedFee and Hours supported for project services
2. **No Webhooks**: Polling required for change detection
3. **No Installments**: Cannot create/modify installments via API
4. **Deletion Tracking**: Manual data comparison required
5. **Rate Limits**: Design for 60 req/min minimum

## Best Practices

1. **Use pagination** for large datasets
2. **Select only needed fields** to reduce response size
3. **Cache responses** where appropriate
4. **Implement retry logic** with exponential backoff for rate limits
5. **Store API credentials securely** - never commit to version control
