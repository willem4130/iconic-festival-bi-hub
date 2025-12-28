# Inbound Email System - Implementation Plan

## Overview

Automated processing of inbound emails for purchase invoices and contracts using Claude Vision OCR and smart classification.

## Architecture

### Email Flow

```
Incoming Email (invoices@domain.com / contracts@domain.com)
    ↓
1. Webhook receives email (SendGrid Inbound Parse / Resend)
    ↓
2. Extract attachments (PDF/images)
    ↓
3. Smart Classification:
   - Check email address (invoices@ vs contracts@)
   - Parse subject line keywords
   - Fallback: Claude Haiku classification ($0.001/email)
    ↓
4a. INVOICE Path:
    - Extract data with Claude Vision ($0.003-0.008/invoice)
    - Create PurchasingInvoice (DRAFT status)
    - Match to project (if mentioned)
    - Notify admin for review
    ↓
4b. CONTRACT Path:
    - Store PDF/document
    - Link to project/employee
    - Create notification
```

## Cost Analysis

- Email handling: Free (SendGrid free tier)
- Classification: $0.001/email (only if needed)
- Invoice OCR: $0.003-0.008/invoice
- **Total: ~$0.01 per invoice email**
- **100 invoices/month = $1/month**

## Email Provider: Resend Inbound Email ✅

**Current Implementation:** Using Resend for both inbound and outbound emails

**Why Resend:**

- Already using Resend for outbound emails (hours reports, notifications)
- Single provider = simpler setup
- Modern API with JSON webhooks (easier to work with than multipart form data)
- No additional accounts needed
- Launched November 2025 - production ready

**Setup:**

1. Configure webhook in Resend dashboard
2. Set event type to `email.received`
3. Point to: `https://simplicate-automations.vercel.app/api/email/inbound`
4. Configure inbound address (e.g., `invoices@yourdomain.com`)

**Alternative Options** (not implemented):

- SendGrid Inbound Parse - requires separate account and MX records
- Cloudflare Email Workers - more complex setup

## Database Schema

### New Tables

```prisma
model InboundEmail {
  id            String   @id @default(cuid())
  from          String
  to            String
  subject       String
  body          String?  @db.Text
  receivedAt    DateTime @default(now())

  // Classification
  type          EmailType?  // INVOICE | CONTRACT | OTHER
  classifiedBy  String?     // ADDRESS | SUBJECT | AI

  // Processing
  processed     Boolean  @default(false)
  processedAt   DateTime?
  error         String?  @db.Text

  // Relations
  attachments   EmailAttachment[]
  invoice       PurchasingInvoice?

  createdAt     DateTime @default(now())

  @@index([from])
  @@index([receivedAt])
  @@index([processed])
}

enum EmailType {
  INVOICE
  CONTRACT
  OTHER
}

model EmailAttachment {
  id            String   @id @default(cuid())
  emailId       String
  filename      String
  contentType   String
  size          Int
  data          Bytes    // Store directly in DB (or S3 URL for large files)

  email         InboundEmail @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([emailId])
}
```

### Schema Updates

```prisma
// Extend PurchasingInvoice
model PurchasingInvoice {
  // ... existing fields ...

  // Add OCR source tracking
  sourceEmailId String?
  sourceEmail   InboundEmail? @relation(fields: [sourceEmailId], references: [id])
  ocrData       Json?         // Raw OCR extraction result
  ocrConfidence Float?        // Confidence score (0-1)
  needsReview   Boolean @default(true)  // Flag for manual review
}
```

## Implementation Steps

### Phase 1: Database Schema ✓

- [ ] Add InboundEmail model
- [ ] Add EmailAttachment model
- [ ] Add EmailType enum
- [ ] Extend PurchasingInvoice with OCR fields
- [ ] Run migration

### Phase 2: Email Classification

- [ ] Create `src/lib/email/classifier.ts`
- [ ] Implement address-based routing
- [ ] Implement keyword detection
- [ ] Add Claude Haiku fallback classification

### Phase 3: Invoice OCR

- [ ] Install `@anthropic-ai/sdk`
- [ ] Create `src/lib/email/invoice-ocr.ts`
- [ ] Implement Claude Vision extraction
- [ ] Add confidence scoring
- [ ] Handle multiple invoices per email

### Phase 4: Webhook Endpoint

- [ ] Create `/api/email/inbound` endpoint
- [ ] Parse multipart form data
- [ ] Extract attachments
- [ ] Call classifier
- [ ] Process invoices/contracts
- [ ] Store in database

### Phase 5: Admin UI

- [ ] `/admin/email/inbox` - View all inbound emails
- [ ] Filter by type (INVOICE/CONTRACT/OTHER)
- [ ] Review OCR results
- [ ] Approve/edit invoices
- [ ] Manual reprocessing

### Phase 6: SendGrid Setup

- [ ] Configure MX records
- [ ] Set up inbound parse webhook
- [ ] Test with real emails
- [ ] Monitor error logs

## API Endpoints

### Webhook (Public)

- `POST /api/email/inbound` - Receive emails from SendGrid

### Admin (Protected)

- `GET /api/trpc/inboundEmail.list` - List all emails
- `GET /api/trpc/inboundEmail.getById` - Get email details
- `POST /api/trpc/inboundEmail.reprocess` - Manually reprocess
- `POST /api/trpc/inboundEmail.approve` - Approve OCR result
- `POST /api/trpc/inboundEmail.reject` - Reject and request manual entry

## Environment Variables

```env
# Anthropic (for Claude Vision OCR)
ANTHROPIC_API_KEY=sk-ant-...

# SendGrid (optional - for webhook validation)
SENDGRID_WEBHOOK_SECRET=...
```

## Testing Strategy

1. **Unit Tests**
   - Email classification logic
   - OCR result parsing

2. **Integration Tests**
   - Send test emails to webhook
   - Verify database records
   - Check OCR accuracy

3. **Manual Testing**
   - Real invoice PDFs
   - Different formats
   - Edge cases (multiple invoices, no invoice, etc.)

## Security Considerations

- Webhook signature verification (SendGrid)
- Rate limiting on webhook endpoint
- File size limits (max 10MB per attachment)
- Virus scanning (optional - ClamAV)
- PII handling (invoices may contain sensitive data)

## Monitoring & Alerts

- Track OCR success rate
- Alert on processing failures
- Monitor costs (Claude API usage)
- Weekly digest of unprocessed emails

## Future Enhancements

- [ ] Email reply handling (approve via email)
- [ ] Automatic project matching (ML-based)
- [ ] Receipt OCR (employee expenses)
- [ ] Multi-language support (Dutch invoices)
- [ ] Integration with accounting software

---

## Setup Guide (Resend)

### 1. Configure Resend Inbound Email

1. **Log in to Resend Dashboard**: https://resend.com/
2. **Navigate to Webhooks**: Settings → Webhooks
3. **Create New Webhook**:
   - **Endpoint URL**: `https://simplicate-automations.vercel.app/api/email/inbound`
   - **Events**: Select `email.received`
   - **Status**: Enable webhook
4. **Save the webhook**

### 2. Configure Inbound Email Address

1. **Navigate to Inbound**: https://resend.com/inbound
2. **Create Inbound Email**:
   - **Option A - Default Address**: Use the auto-generated `.resend.app` address
   - **Option B - Custom Domain**:
     - Add your domain if not already added
     - Create custom address (e.g., `invoices@yourdomain.com`)
     - Configure DNS records as shown in Resend dashboard
3. **Link to Webhook**: Select the webhook you created in step 1

### 3. Test the Integration

Send a test email with an invoice PDF to your configured address:

**To**: `invoices@yourdomain.com` (or your `.resend.app` address)
**Subject**: Invoice #12345
**Attachment**: Any PDF invoice

### 4. Verify in Admin UI

1. Visit: https://simplicate-automations.vercel.app/admin/email/inbox
2. You should see the received email
3. If it has an invoice attachment, a draft `PurchasingInvoice` should be created
4. Check the OCR results and invoice data

### 5. Monitor Logs

Check Vercel logs for any errors:

```bash
npx vercel logs https://simplicate-automations.vercel.app --follow
```

Look for log entries like:

- `[Inbound Email] From: ..., To: ..., Subject: ...`
- `[Attachment] Downloading ... from ...`
- `[Invoice Processing] Running OCR on ...`
- `[Invoice Processing] Created draft invoice: ...`
