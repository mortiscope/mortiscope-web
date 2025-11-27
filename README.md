<div align="center">
  <br />
  <img src="public/seo/opengraph-image-v2.png" alt="Mortiscope Web Banner" />
  <br /><br />
  <div>
    <img
      alt="Auth.js"
      src="https://custom-icon-badges.demolab.com/badge/Auth.js-801DDA?logo=auth.js&logoColor=fff"
    />
    <img
      alt="AWS S3"
      src="https://custom-icon-badges.demolab.com/badge/AWS-%23FF9900.svg?logo=aws&logoColor=white"
    />
    <img
      alt="Docker"
      src="https://img.shields.io/badge/Docker-%232496ED?style=flat&logo=docker&logoColor=white"
    />
    <img
      alt="Drizzle ORM"
      src="https://img.shields.io/badge/Drizzle%20ORM-%2399D60A?logo=drizzle&logoColor=white"
    />
    <img
      alt="ESLint"
      src="https://img.shields.io/badge/ESLint-%234B32C3?style=flat&logo=eslint&logoColor=white"
    />
    <img
      alt="Framer Motion"
      src="https://img.shields.io/badge/Framer%20Motion-%230055FF?style=flat&logo=framer&logoColor=white"
    />
    <img
      alt="Immer"
      src="https://img.shields.io/badge/Immer-%2300E7C3?logo=immer&logoColor=white"
    />
    <img
      alt="JSON Web Tokens"
      src="https://img.shields.io/badge/JSON%20Web%20Tokens-%23000000?logo=jsonwebtokens&logoColor=white"
    />
    <img
      alt="Lighthouse"
      src="https://img.shields.io/badge/Lighthouse-%23F44B21?logo=lighthouse&logoColor=white"
    />
    <img
      alt="Mock Service Worker"
      src="https://img.shields.io/badge/Mock%20Service%20Worker-%23FF6A33?logo=mockserviceworker&logoColor=white"
    />
    <img
      alt="Next.js"
      src="https://img.shields.io/badge/Next.js-%23000000?style=flat&logo=nextdotjs&logoColor=white"
    />
    <img
      alt="Pino"
      src="https://img.shields.io/badge/Pino-%23687634?logo=pino&logoColor=white"
    />
    <img
      alt="Playwright"
      src="https://custom-icon-badges.demolab.com/badge/Playwright-2EAD33?logo=playwright&logoColor=fff"
    />
    <img
      alt="pnpm"
      src="https://img.shields.io/badge/pnpm-%23F69220?style=flat&logo=pnpm&logoColor=white"
    />
    <img
      alt="PostgreSQL"
      src="https://img.shields.io/badge/PostgreSQL-%234169E1?style=flat&logo=postgresql&logoColor=white"
    />
    <img
      alt="Radix UI"
      src="https://img.shields.io/badge/Radix%20UI-%23111111?style=flat&logo=radixui&logoColor=white"
    />
    <img
      alt="React"
      src="https://img.shields.io/badge/React-%230088CC?logo=react&logoColor=white"
    />
    <img
      alt="React Hook Form"
      src="https://img.shields.io/badge/React%20Hook%20Form-%23EC5990?style=flat&logo=reacthookform&logoColor=white"
    />
    <img
      alt="React Query"
      src="https://img.shields.io/badge/React%20Query-%23FF4154?logo=reactquery&logoColor=white"
    />
    <img
      alt="React Table"
      src="https://img.shields.io/badge/React%20Table-%23FF4154?logo=reacttable&logoColor=white"
    />
    <img
      alt="Resend"
      src="https://img.shields.io/badge/Resend-%23000000?style=flat&logo=resend&logoColor=white"
    />
    <img
      alt="Sentry"
      src="https://img.shields.io/badge/Sentry-%23362D59?style=flat&logo=sentry&logoColor=white"
    />
    <img
      alt="shadcn/ui"
      src="https://img.shields.io/badge/shadcn%2Fui-%23000000?logo=shadcnui&logoColor=white"
    />
    <img
      alt="Tailwind CSS"
      src="https://img.shields.io/badge/Tailwind%20CSS-%2306B6D4?style=flat&logo=tailwindcss&logoColor=white"
    />
    <img
      alt="TypeScript"
      src="https://img.shields.io/badge/TypeScript-%233178C6?style=flat&logo=typescript&logoColor=white"
    />
    <img
      alt="Upstash Redis"
      src="https://img.shields.io/badge/Upstash%20Redis-%2300E9A3?logo=upstash&logoColor=white"
    />
    <img
      alt="Vercel"
      src="https://img.shields.io/badge/Vercel-%23000000.svg?logo=vercel&logoColor=white"
    />
    <img
      alt="Vitest"
      src="https://img.shields.io/badge/Vitest-%2300FF74?logo=vitest&logoColor=white"
    />
    <img
      alt="Zod"
      src="https://img.shields.io/badge/Zod-%233E67B1?style=flat&logo=zod&logoColor=white"
    />
  </div>
</div>
<br />

**Mortiscope Web** is the full-stack web application that powers the Mortiscope Post-Mortem Interval (PMI) estimation system. It is a tool for estimating how long a person has been deceased by analyzing the developmental stage of _Chrysomya megacephala_ specimens found at a scene. It integrates with the [Mortiscope API](https://github.com/mortiscope/mortiscope-api) inference engine, which handles the underlying object detection and PMI computation.

The application covers the entire case workflow which consists of structured case creation with collection metadata and image ingestion, asynchronous AI-driven analysis, interactive result visualization with manual annotation editing and recalculation, cross-case dashboard analytics, multi-format export, and a full account system with multi-provider authentication and session management.

## 🚀 Getting Started

This guide provides multiple approaches to set up and run the Mortiscope Web application for local development and testing.

### 📋 Prerequisites

Before beginning, ensure the following are installed and configured:

- **[Node.js 20.0+](https://nodejs.org/)** — The JavaScript runtime for the application. A **[Long-Term Support LTS](https://nodejs.org/en/about/previous-releases)** version is recommended for stability.
- **[pnpm 10.0+](https://pnpm.io/)** — Fast, disk space efficient package manager. Recommended for this project and required by the lockfile. Install globally via `npm install -g pnpm` or `corepack enable pnpm`.
- **[Git](https://git-scm.com/downloads)** — Distributed version control system needed to clone the repository and manage code changes.
- **[PostgreSQL](https://www.postgresql.org/)** — Primary relational database for storing case data, detections, analyses, and exports. Version 16+ recommended.
- **[AWS S3](https://aws.amazon.com/s3/)** — Cloud object storage for images and export artifacts. Requires an active AWS account, an S3 bucket, and IAM credentials with read/write permissions.
- **[Upstash Redis](https://upstash.com/)** — Serverless Redis database for rate limiting and session management. Create a free account and database at [upstash.com](https://upstash.com/).
- **[Resend](https://resend.com/)** — Email API for transactional emails including account verification, password reset, and two-factor authentication codes. Requires a Resend account and API key.
- **[Docker](https://www.docker.com/)** (Optional) — Container platform for running the application and database in isolated environments. Required only if using the Docker deployment method.
- **[Make](https://www.gnu.org/software/make/)** (Optional) — Build automation tool. Pre-installed on macOS/Linux. Windows users can install via [Chocolatey](https://chocolatey.org/) (`choco install make`) or use the commands directly.
- **[Mortiscope API](https://github.com/mortiscope/mortiscope-api)** — The FastAPI inference engine that handles object detection and PMI computation. Must be running and accessible for the analysis pipeline to function.

### 📥 Clone Repository

Clone the repository to the local machine:

```bash
git clone https://github.com/mortiscope/mortiscope-web.git
cd mortiscope-web
```

### 🔐 Environment Configuration

The application requires environment variables for database connection, authentication, AWS services, email delivery, and external API integrations.

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and configure the following variables:

**Authentication Configuration:**

- `AUTH_SECRET` — Secret key for Auth.js session signing (generate with `openssl rand -base64 32`)
- `AUTH_TRUST_HOST` — Set to `true` in production behind a proxy

**OAuth Provider Configuration (Optional):**

- `GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0 Client Secret
- `ORCID_CLIENT_ID` — ORCID OAuth Client ID
- `ORCID_CLIENT_SECRET` — ORCID OAuth Client Secret
- `AUTH_MICROSOFT_ENTRA_ID_ID` — Microsoft Entra ID Application Client ID
- `AUTH_MICROSOFT_ENTRA_ID_SECRET` — Microsoft Entra ID Client Secret
- `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` — Microsoft Entra ID Tenant ID

**Email Configuration:**

- `RESEND_API_KEY` — Resend API key for sending transactional emails
- `RESEND_MAIL_DOMAIN` — Verified domain for sending emails

**AWS S3 Configuration:**

- `AWS_BUCKET_NAME` — S3 bucket name
- `AWS_BUCKET_REGION` — S3 bucket region
- `AWS_ACCESS_KEY_ID` — IAM access key with S3 permissions
- `AWS_SECRET_ACCESS_KEY` — IAM secret key

**Redis Configuration:**

- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST API token

**Inngest Configuration:**

- `INNGEST_EVENT_KEY` — Secret key for Inngest event authentication
- `INNGEST_SIGNING_KEY` — Secret key for Inngest request signature verification

**Application Configuration:**

- `NEXT_PUBLIC_APP_URL` — The canonical base URL of the application
- `NEXT_PUBLIC_CONTACT_EMAIL` — Default contact email address for the application
- `NEXT_PUBLIC_FASTAPI_URL` — The base URL of the Mortiscope API inference engine

**Security Configuration:**

- `FASTAPI_SECRET_KEY` — Secret key for authenticating with the FastAPI backend
- `CRON_SECRET` — Secret token for authorizing cron job endpoints
- `ENCRYPTION_KEY` — Secret key for encrypting sensitive data (generate with `openssl rand -hex 32`)

**Optional Configuration:**

- `MAXMIND_LICENSE_KEY` — MaxMind GeoLite2 license key for IP geolocation
- `SENTRY_AUTH_TOKEN` — Sentry authentication token for error tracking and performance monitoring
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry Data Source Name for client-side error tracking
- `LOG_LEVEL` — Logging level (`debug`, `info`, `warn`, `error`).

> [!TIP]
> Generate secure random keys using OpenSSL: `openssl rand -base64 32` or `openssl rand -hex 32`
