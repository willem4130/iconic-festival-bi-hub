# Database Schema Additions

Add these models to `prisma/schema.prisma`:

## New Enums

```prisma
enum ExpenseCategory {
  KILOMETERS
  TRAVEL
  MATERIALS
  SOFTWARE
  OTHER
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
  INVOICED
}

enum PurchasingInvoiceStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PAID
  REJECTED
}

enum TemplateSource {
  UPLOADED
  SIMPLICATE
}

enum QueueStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## New Models

```prisma
// Project-Employee assignments with rates
model ProjectMember {
  id                  String   @id @default(cuid())
  projectId           String
  userId              String
  simplicateServiceId String?  @unique

  role                String?
  hourlyRate          Float?
  budgetedHours       Float?

  joinedAt            DateTime @default(now())
  leftAt              DateTime?

  project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

// Project budget tracking
model ProjectBudget {
  id                  String   @id @default(cuid())
  projectId           String   @unique
  simplicateServiceId String?

  totalBudgetHours    Float?
  totalBudgetAmount   Float?
  defaultHourlyRate   Float?

  usedHours           Float    @default(0)
  usedAmount          Float    @default(0)

  updatedAt           DateTime @updatedAt

  project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// Expense tracking
model Expense {
  id                  String          @id @default(cuid())
  projectId           String
  userId              String
  simplicateExpenseId String?         @unique

  category            ExpenseCategory
  description         String?
  amount              Float
  kilometers          Float?
  date                DateTime
  status              ExpenseStatus   @default(PENDING)
  receiptUrl          String?

  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  project             Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([userId])
  @@index([status])
}

// Purchasing invoices (employees invoicing SCEX)
model PurchasingInvoice {
  id                    String                   @id @default(cuid())
  projectId             String
  userId                String

  periodStart           DateTime
  periodEnd             DateTime

  totalHours            Float
  hourlyRate            Float
  hoursAmount           Float

  kmTotal               Float?
  kmRate                Float?
  kmAmount              Float?
  expensesAmount        Float?
  expenseDetails        Json?

  subtotal              Float
  vatRate               Float?
  vatAmount             Float?
  total                 Float

  status                PurchasingInvoiceStatus @default(DRAFT)
  uploadedDocUrl        String?
  generatedDocUrl       String?

  submittedAt           DateTime?
  approvedAt            DateTime?
  paidAt                DateTime?

  simplicateInvoiceId   String?                  @unique

  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  project               Project                  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                  User                     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([userId])
  @@index([status])
}

// Contract templates
model ContractTemplate {
  id              String         @id @default(cuid())
  name            String
  description     String?

  source          TemplateSource
  fileUrl         String?
  simplicateDocId String?

  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

// Workflow execution queue
model WorkflowQueue {
  id            String       @id @default(cuid())
  workflowType  WorkflowType
  projectId     String?
  userId        String?

  payload       Json
  status        QueueStatus  @default(PENDING)
  attempts      Int          @default(0)
  maxAttempts   Int          @default(3)

  scheduledFor  DateTime     @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  error         String?

  createdAt     DateTime     @default(now())

  @@index([status, scheduledFor])
  @@index([workflowType])
}
```

## Relations to Add to Existing Models

Add to `User` model:

```prisma
  projectMembers      ProjectMember[]
  expenses            Expense[]
  purchasingInvoices  PurchasingInvoice[]
```

Add to `Project` model:

```prisma
  members             ProjectMember[]
  budget              ProjectBudget?
  expenses            Expense[]
  purchasingInvoices  PurchasingInvoice[]
```

Add to `AppSettings` model:

```prisma
  kmRate              Float   @default(0.23)
```

## After Adding

Run:

```bash
npm run db:push
npm run db:generate
```
