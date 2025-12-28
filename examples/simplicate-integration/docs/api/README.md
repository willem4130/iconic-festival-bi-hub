# Simplicate API Documentation

This folder contains reference documentation for the Simplicate REST API v2.

## Official Resources

- **Developer Portal**: https://developer.simplicate.com
- **API Explorer**: https://developer.simplicate.com/explore
- **Getting Started**: https://developer.simplicate.com/getting-started

## Files in this Folder

- `api-overview.md` - Authentication, base URL, rate limits, error handling
- `endpoints.md` - All available API endpoints by module
- `entities/` - Detailed field definitions for each entity
  - `projects.md`
  - `hours.md`
  - `invoices.md`
  - `employees.md`
  - `organizations.md`
  - `persons.md`

## Quick Reference

### Base URL

```
https://{yourdomain}.simplicate.nl/api/v2/
```

### Authentication Headers

```
Authentication-Key: {API Key}
Authentication-Secret: {API Secret}
Content-Type: application/json
```

### Rate Limits

- Minimum: 60 requests per minute
- Exceeding returns HTTP 429

### Pagination

- Default limit: 100 records
- Use `offset` and `limit` parameters
- Get metadata with `?metadata=count,limit,offset`
