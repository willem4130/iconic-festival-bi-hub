# Simplicate API Endpoints

All endpoints use the base URL: `https://{domain}.simplicate.nl/api/v2/`

## CRM Module

### Organizations

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| GET    | `/crm/organization`      | List all organizations |
| GET    | `/crm/organization/{id}` | Get organization by ID |
| POST   | `/crm/organization`      | Create organization    |
| PUT    | `/crm/organization/{id}` | Update organization    |
| DELETE | `/crm/organization/{id}` | Delete organization    |

### Persons

| Method | Endpoint           | Description      |
| ------ | ------------------ | ---------------- |
| GET    | `/crm/person`      | List all persons |
| GET    | `/crm/person/{id}` | Get person by ID |
| POST   | `/crm/person`      | Create person    |
| PUT    | `/crm/person/{id}` | Update person    |
| DELETE | `/crm/person/{id}` | Delete person    |

### Contact Persons (Organization-Person Link)

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| GET    | `/crm/contactperson` | List contact persons        |
| POST   | `/crm/contactperson` | Link person to organization |

### Custom Fields

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| GET    | `/crm/organizationcustomfields` | Get org custom field options    |
| GET    | `/crm/personcustomfields`       | Get person custom field options |

### Merge Operations

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| POST   | `/crm/mergeorganization` | Merge two organizations |
| POST   | `/crm/mergeperson`       | Merge two persons       |

## Projects Module

### Projects

| Method | Endpoint                 | Description       |
| ------ | ------------------------ | ----------------- |
| GET    | `/projects/project`      | List all projects |
| GET    | `/projects/project/{id}` | Get project by ID |
| POST   | `/projects/project`      | Create project    |
| PUT    | `/projects/project/{id}` | Update project    |
| DELETE | `/projects/project/{id}` | Delete project    |

### Project Services

| Method | Endpoint                 | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/projects/service`      | List all services                    |
| GET    | `/projects/service/{id}` | Get service by ID                    |
| POST   | `/projects/service`      | Create service                       |
| PUT    | `/projects/service/{id}` | Update service (FixedFee/Hours only) |

### Project Status

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/projects/projectstatus` | List project statuses |

### Project Custom Fields

| Method | Endpoint                        | Description              |
| ------ | ------------------------------- | ------------------------ |
| GET    | `/projects/projectcustomfields` | Get custom field options |

## HRM Module

### Employees

| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| GET    | `/hrm/employee`      | List all employees |
| GET    | `/hrm/employee/{id}` | Get employee by ID |
| POST   | `/hrm/employee`      | Create employee    |
| PUT    | `/hrm/employee/{id}` | Update employee    |

### Leave / Absence

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/hrm/leave`      | List leave records   |
| GET    | `/hrm/leave/{id}` | Get leave record     |
| POST   | `/hrm/leave`      | Create leave request |
| PUT    | `/hrm/leave/{id}` | Update leave request |

### Timetables

| Method | Endpoint         | Description     |
| ------ | ---------------- | --------------- |
| GET    | `/hrm/timetable` | List timetables |

### Contract Types

| Method | Endpoint            | Description         |
| ------ | ------------------- | ------------------- |
| GET    | `/hrm/contracttype` | List contract types |

## Hours Module

### Hours Registration

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| GET    | `/hours/hours`      | List all hours entries |
| GET    | `/hours/hours/{id}` | Get hours entry        |
| POST   | `/hours/hours`      | Create hours entry     |
| PUT    | `/hours/hours/{id}` | Update hours entry     |
| DELETE | `/hours/hours/{id}` | Delete hours entry     |

### Hours Types

| Method | Endpoint           | Description      |
| ------ | ------------------ | ---------------- |
| GET    | `/hours/hourstype` | List hours types |

### Approval Status

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| GET    | `/hours/approvalstatus` | List approval statuses |

## Invoices Module

### Invoices

| Method | Endpoint                 | Description       |
| ------ | ------------------------ | ----------------- |
| GET    | `/invoices/invoice`      | List all invoices |
| GET    | `/invoices/invoice/{id}` | Get invoice by ID |
| POST   | `/invoices/invoice`      | Create invoice    |
| PUT    | `/invoices/invoice/{id}` | Update invoice    |

### Invoice Lines

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/invoices/invoiceline` | List invoice lines |

### Invoice Status

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/invoices/invoicestatus` | List invoice statuses |

### Payment Terms

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/invoices/paymentterm` | List payment terms |

## Sales Module

### Sales / Deals

| Method | Endpoint           | Description    |
| ------ | ------------------ | -------------- |
| GET    | `/sales/sale`      | List all sales |
| GET    | `/sales/sale/{id}` | Get sale by ID |
| POST   | `/sales/sale`      | Create sale    |
| PUT    | `/sales/sale/{id}` | Update sale    |

### Quotes

| Method | Endpoint            | Description  |
| ------ | ------------------- | ------------ |
| GET    | `/sales/quote`      | List quotes  |
| GET    | `/sales/quote/{id}` | Get quote    |
| POST   | `/sales/quote`      | Create quote |
| PUT    | `/sales/quote/{id}` | Update quote |

### Sales Status

| Method | Endpoint            | Description         |
| ------ | ------------------- | ------------------- |
| GET    | `/sales/salestatus` | List sales statuses |

### Sales Sources

| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| GET    | `/sales/salessource` | List sales sources |

## Documents Module

### Documents

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/documents/document`      | List documents        |
| GET    | `/documents/document/{id}` | Get document metadata |
| POST   | `/documents/document`      | Create document       |
| DELETE | `/documents/document/{id}` | Delete document       |

### Document Download

| Method | Endpoint                   | Description            |
| ------ | -------------------------- | ---------------------- |
| GET    | `/documents/download/{id}` | Download document file |

### Document Types

| Method | Endpoint                  | Description         |
| ------ | ------------------------- | ------------------- |
| GET    | `/documents/documenttype` | List document types |

## Upload Module

### Chunked Upload

| Method | Endpoint          | Description           |
| ------ | ----------------- | --------------------- |
| POST   | `/upload/chunked` | Upload file (chunked) |

Required body:

```json
{
  "file_name": "document.pdf",
  "file_size": 1048576
}
```

## Custom Fields Module

### Custom Field Definitions

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| GET    | `/customfields/customfieldgroups` | List custom field groups |
| GET    | `/customfields/customfieldmodels` | List custom field models |

## Costs Module

### Expenses

| Method | Endpoint              | Description    |
| ------ | --------------------- | -------------- |
| GET    | `/costs/expense`      | List expenses  |
| GET    | `/costs/expense/{id}` | Get expense    |
| POST   | `/costs/expense`      | Create expense |
| PUT    | `/costs/expense/{id}` | Update expense |

## Mileage Module

### Mileage Registration

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/mileage/mileage` | List mileage entries |
| POST   | `/mileage/mileage` | Create mileage entry |

## My Organization Module

### Organization Profiles

| Method | Endpoint                     | Description                |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/crm/myorganizationprofile` | List organization profiles |

## Timeline Module

### Timeline Messages

| Method | Endpoint            | Description             |
| ------ | ------------------- | ----------------------- |
| GET    | `/timeline/message` | List timeline messages  |
| POST   | `/timeline/message` | Create timeline message |
