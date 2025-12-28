# Warehouse Pick Optimizer 📦

> **Production-ready warehouse pick optimization platform** - Upload Excel files, map client data to templates, enforce referential integrity, and analyze with Power BI-like capabilities.

A comprehensive Next.js application that transforms diverse client warehouse data into standardized templates while providing powerful BI analytics, Pareto analysis, and data transformation capabilities.

## 🎯 What It Does

The Warehouse Pick Optimizer helps logistics companies:

1. **Upload large Excel files** (10K-1M rows) with client warehouse data
2. **Map diverse column structures** to standardized PICK and LOCATION templates
3. **Validate data integrity** with 134+ business rules and referential checks
4. **Transform bay data** using 3 strategies (naming conventions, proximity, manual)
5. **Analyze with BI dashboards** featuring multi-dimensional Pareto analysis
6. **Export optimized templates** ready for warehouse management systems

### Key Features

- **Excel Processing**: Streaming parser handles files up to 5GB
- **Flexible Mapping**: Auto-detect columns + visual mapping builder
- **Strict Validation**: Enforces capacityLayout sum = 1.0, bay constraints
- **Bay Transformation**: Groups locations into bays (3 strategies)
- **Pareto Analysis**: Multi-dimensional analysis with Recharts visualization
- **Power Query & DAX**: Transform data with visual builders + Monaco editor
- **Extra Dimensions**: Captures ALL client columns beyond template requirements
- **Real-time Processing**: Chunked uploads with progress tracking

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or later
- **PostgreSQL** 16 (local or hosted)
- **npm** or **pnpm**

### 1. Clone & Install

```bash
git clone https://github.com/willem4130/warehouse-pick-optimizer.git
cd warehouse-pick-optimizer
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_optimizer"
DIRECT_URL="postgresql://user:password@localhost:5432/warehouse_optimizer"

# NextAuth (REQUIRED)
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob Storage (REQUIRED for file uploads)
BLOB_READ_WRITE_TOKEN="get-from-vercel-dashboard"

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Email (Optional - for notifications)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"
```

**Generate secrets:**

```bash
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

### 3. Set Up Database

```bash
# Create database
createdb warehouse_optimizer

# Push schema and seed
npm run db:push
npm run db:generate
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit **http://localhost:3000**

### 5. Create Admin User

1. Navigate to `/auth/signin`
2. Sign up with email (auto-created as USER)
3. Manually update role to ADMIN in database:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
   ```

## 📦 Core Tech Stack

### Frontend

- **Next.js 16** - App Router, React 19, Turbopack
- **TypeScript** - Strict mode, full type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - 28 accessible components
- **Recharts** - BI dashboard visualizations
- **Monaco Editor** - DAX formula editing

### Backend

- **tRPC v11** - End-to-end typesafe APIs
- **Prisma ORM** - Type-safe database with 17 models
- **PostgreSQL** - Production database with connection pooling
- **Zod** - Runtime validation

### Infrastructure

- **Vercel** - Hosting + Edge Network
- **Vercel Blob** - File storage (5GB max per file)
- **Upstash Redis** - Rate limiting
- **Vercel Analytics** - Privacy-friendly metrics

### File Processing

- **xlsx** - Excel parsing (XLSX/XLS)
- **Streaming parser** - Memory-optimized for large files
- **Chunked uploads** - 10K rows per chunk

## 🏗️ Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard
│   │   ├── upload/               # File upload wizard
│   │   ├── analytics/            # BI dashboards
│   │   │   ├── pareto/           # Pareto analysis (KEY)
│   │   │   ├── location/         # Location utilization
│   │   │   ├── quality/          # Data quality metrics
│   │   │   └── comparison/       # Upload comparison
│   │   ├── query/                # Query builder
│   │   └── export/               # Export manager
│   └── api/
│       ├── health/               # Health check endpoint
│       ├── upload/               # File upload endpoint
│       └── trpc/                 # tRPC API endpoint
├── server/
│   └── api/
│       ├── routers/              # tRPC routers
│       │   ├── upload.ts         # Upload management
│       │   ├── mapping.ts        # Column mapping
│       │   ├── transformation.ts # Bay transformation
│       │   ├── validation.ts     # Data validation
│       │   ├── analytics.ts      # BI & Pareto
│       │   ├── export.ts         # Template export
│       │   ├── query.ts          # Query engine
│       │   └── transforms.ts     # Power Query & DAX
│       ├── root.ts               # Main router
│       └── trpc.ts               # tRPC configuration
├── lib/                          # Core business logic
│   ├── excel/                    # Excel processing
│   ├── mapping/                  # Column mapping
│   ├── transformation/           # Bay transformation
│   ├── validation/               # Data validation
│   ├── analytics/                # BI analytics
│   ├── export/                   # Export engine
│   ├── query/                    # Query engine
│   └── transforms/               # Power Query & DAX
└── components/                   # React components
    ├── ui/                       # shadcn/ui (28 components)
    ├── upload/                   # Upload wizard
    ├── mapping/                  # Mapping builder
    ├── validation/               # Validation report
    ├── analytics/                # Charts & BI
    ├── query/                    # Query builder UI
    └── transforms/               # Power Query & DAX UI
```

## 📊 Database Schema

17 production-ready models:

### Core Models

- **Project** - Top-level container for warehouse work
- **Upload** - File upload with processing status
- **Pick** - Article pick information (7 required columns)
- **Location** - Physical warehouse locations (8 required columns)
- **Bay** - Grouped locations (3 transformation strategies)

### Analysis Models

- **ParetoAnalysis** - Multi-dimensional Pareto results
- **LocationUtilization** - Usage metrics for BI dashboards
- **ValidationError** - Data quality tracking

### Configuration Models

- **MappingConfig** - Column mapping presets
- **TransformationPipeline** - Power Query pipelines
- **CalculatedField** - DAX calculated fields
- **Subset** - User-defined data filters

### Supporting Models

- **BayCategory** - Bay grouping categories
- **ArticleLocation** - Pick-Location junction
- **ExtraDimension** - Captures extra client columns

## 🛠️ Available Scripts

### Development

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run typecheck    # Type check (CRITICAL - run after changes)
```

### Database

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with bay categories
```

### Testing

```bash
npm run test         # Run Vitest unit tests
npm run test:ui      # Open Vitest UI
npm run test:e2e     # Run Playwright e2e tests
npm run test:e2e:ui  # Open Playwright UI
```

## 🚢 Production Deployment

### Vercel Deployment (Recommended)

#### Step 1: Create GitHub Repository

```bash
# Create new repo on GitHub: warehouse-pick-optimizer
# Then push your code:
git remote remove origin  # if exists
git remote add origin https://github.com/your-username/warehouse-pick-optimizer.git
git branch -M main
git add .
git commit -m "Initial commit: Production-ready warehouse optimizer"
git push -u origin main
```

#### Step 2: Deploy to Vercel

**Option A: Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B: Vercel Dashboard**

1. Go to https://vercel.com/new
2. Import `warehouse-pick-optimizer` repository
3. Configure:
   - **Root Directory**: `tech stack`
   - **Framework**: Next.js
   - **Build Command**: `prisma generate && next build`
   - **Install Command**: `npm install`
4. Add environment variables (see below)
5. Deploy!

#### Step 3: Configure Production Environment

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database (Use Vercel Postgres, Supabase, or Railway)
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# NextAuth
NEXTAUTH_SECRET="your-random-32-char-secret"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Vercel Blob (Auto-configured by Vercel Storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
ENABLE_RATE_LIMITING="true"

# Email (Optional)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@your-domain.com"
```

#### Step 4: Set Up Database

**Option 1: Vercel Postgres** ($0.01/GB)

1. Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection strings to environment variables
3. Done!

**Option 2: Supabase** (Free tier: 500MB)

1. Create project at https://supabase.com
2. Database Settings → Connection String
3. Use "Transaction" mode for `DATABASE_URL`
4. Use "Session" mode for `DIRECT_URL`

**Option 3: Railway** (Free tier: 512MB)

1. Create project at https://railway.app
2. New → Database → PostgreSQL
3. Copy `DATABASE_URL` from variables

#### Step 5: Enable Vercel Blob Storage

1. Vercel Dashboard → Storage → Create Blob Store
2. Name: `warehouse-files`
3. Copy `BLOB_READ_WRITE_TOKEN` to environment variables

#### Step 6: Push Database Schema

```bash
# From your local machine
npm run db:push   # Pushes schema to production database
npm run db:seed   # Seeds bay categories
```

#### Step 7: Verify Deployment

- Visit: `https://your-domain.vercel.app/health`
- Should return: `{ status: "healthy", database: "connected", ... }`

### GitHub Actions CI/CD

Every push/PR triggers:

1. Type checking
2. Linting
3. Format checking
4. Build verification
5. Unit tests

**View status:** GitHub Actions tab

### Production Checklist

- [ ] GitHub repository created
- [ ] Vercel project created and linked
- [ ] Database provisioned (Vercel/Supabase/Railway)
- [ ] Environment variables configured
- [ ] Vercel Blob storage enabled
- [ ] Schema pushed: `npm run db:push`
- [ ] Database seeded: `npm run db:seed`
- [ ] Health check passes: `/health`
- [ ] Admin user created
- [ ] Custom domain configured (optional)
- [ ] Upstash Redis configured (optional)
- [ ] Vercel Analytics enabled (automatic)

## 📖 Template Structure

### PICK Template (7 required columns)

| Column             | Type   | Description             | Example       |
| ------------------ | ------ | ----------------------- | ------------- |
| article            | string | Article number/code     | "ART-12345"   |
| articleDescription | string | Article name            | "Widget Pro"  |
| family             | string | Product family/category | "Electronics" |
| pickFrequency      | float  | Picks per period        | 150.5         |
| location           | string | Location code (FK)      | "A-01-02"     |
| quantity           | float  | Quantity per pick       | 5.0           |
| uniqueArticles     | int    | Unique articles count   | 3             |

### LOCATION Template (8 required columns)

| Column           | Type   | Description           | Example               | Validation          |
| ---------------- | ------ | --------------------- | --------------------- | ------------------- |
| location         | string | Location code (PK)    | "A-01-02"             | Unique              |
| storageType      | string | Storage type          | "Pallet"              | -                   |
| locationLength   | float  | Length (meters)       | 1.2                   | > 0                 |
| locationWidth    | float  | Width (meters)        | 0.8                   | > 0                 |
| locationHeight   | float  | Height (meters)       | 2.4                   | > 0                 |
| capacityLayout   | string | Capacity distribution | "0.25-0.25-0.25-0.25" | **Must sum to 1.0** |
| locationCategory | string | ABC category          | "A"                   | -                   |
| bay              | string | Bay identifier        | "Bay-A"               | -                   |

### Extra Dimensions

Any columns beyond the template are captured in `ExtraDimension` table:

- Original column name preserved
- Values stored as strings
- Queryable for custom reports

## 🔒 Security Features

- **HTTPS** enforced (TLS 1.3)
- **Rate limiting** (100 requests/10min per IP on upload)
- **SQL injection** protection via Prisma
- **XSS** protection via Next.js escaping
- **CSRF** protection via NextAuth
- **File validation** (.xlsx/.xls only, max 5GB)
- **Environment variables** encrypted at rest
- **Security headers** configured in `vercel.json`

## 📈 Monitoring

### Health Check Endpoint

**GET** `/api/health` or `/health`

Returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": "3600s",
  "responseTime": "45ms",
  "environment": "production",
  "checks": {
    "database": { "status": "connected", "latency": "15ms" },
    "blobStorage": { "status": "configured", "configured": true },
    "memory": { "heapUsed": "120 MB", "percentUsed": "45%" }
  }
}
```

Use for uptime monitoring with:

- UptimeRobot
- Pingdom
- Better Stack

## 🤝 Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## 📝 License

MIT License - use freely for personal and commercial projects.

---

**Questions?** Check the [deployment documentation](./CLAUDE.md#production-deployment-pipeline) for detailed setup instructions.

**Ready to deploy?** Follow the [Vercel deployment guide](#vercel-deployment-recommended) above.
