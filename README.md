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

### 📦 Installation

> [!TIP]
> **pnpm** is the recommended package manager and provides the optimal development experience with faster installs and strict dependency management. If pnpm is unavailable, npm or Yarn can be used as alternatives.

Select one of the following installation methods.

#### 📦 Using pnpm

pnpm is the recommended package manager for this project. It handles dependency installation with better performance and disk efficiency.

1. Install all dependencies:

   ```bash
   pnpm install
   ```

2. The installation will automatically set up Husky pre-commit hooks via the `prepare` script.

#### 💾 Using npm or Yarn

> [!NOTE]
> This path skips pnpm. The `pnpm-lock.yaml` lockfile will be ignored, which may result in slightly different dependency versions. Makefile commands assume pnpm and may not work correctly.

1. Install with npm:

   ```bash
   npm install
   ```

   Or with Yarn:

   ```bash
   yarn install
   ```

2. Run the server directly:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

#### 🛠️ Using Makefile

The project includes a [`Makefile`](Makefile) with convenient shortcuts for common development tasks.

1. View all available commands:

   ```bash
   make help
   ```

2. Install dependencies (runs `pnpm install`):

   ```bash
   make install
   ```

> [!NOTE]
> All Makefile commands use pnpm internally. Ensure pnpm is installed before using Makefile shortcuts.

#### 🐳 Using Docker

Docker provides a fully containerized environment with all dependencies pre-configured.

1. Ensure Docker Engine and Docker Compose are installed and running.

2. Build and start all services:

   ```bash
   docker compose up --build -d
   ```

   This starts:
   - Next.js web application on `http://localhost:3000`
   - Inngest dev server on `http://localhost:8288`
   - PostgreSQL database on port `5432`

3. View logs:

   ```bash
   docker compose logs -f
   ```

   Or via Makefile:

   ```bash
   make docker-logs
   ```

### 🖥️ Running the Application

#### 💻 Local Development

Run the Next.js application with hot-reloading enabled for development:

```bash
pnpm run dev:web
```

This command starts both:

- Next.js dev server with Turbo on `http://localhost:3000`
- Inngest dev server on `http://localhost:8288`

For Webpack-based development (without Turbo):

```bash
pnpm run dev:webpack
```

Access the application at:

- Web Application: `http://localhost:3000`
- Inngest Dashboard: `http://localhost:8288`

#### ⚡ Via Makefile

Start the development server with a single command:

```bash
make dev
```

This automatically runs `pnpm run dev:web` with both Next.js and Inngest.

#### 🐳 Via Docker Compose

With Docker Compose, the server starts automatically upon running:

```bash
make docker-up
```

Or directly:

```bash
docker compose up -d
```

Stop the services:

```bash
make docker-down
```

Access container shell for debugging:

```bash
make docker-shell
```

### 🧪 Development Tools

> [!WARNING]
> This section assumes all dependencies are installed. Run `pnpm install` first. For **npm/yarn** installations without Makefile, use the direct npm script equivalents from [`package.json`](package.json).

#### 🔍 Linting and Type Checking

The project uses **ESLint** for code linting and **TypeScript** for static type checking.

- Run linter with strict rules (fails on warnings):

  ```bash
  pnpm run lint:strict
  ```

  Or via Makefile:

  ```bash
  make lint
  ```

- Auto-fix linting issues:

  ```bash
  pnpm run lint:fix
  ```

  Or via Makefile:

  ```bash
  make lint-fix
  ```

- Run TypeScript type checking:

  ```bash
  pnpm run typecheck
  ```

  Or via Makefile:

  ```bash
  make typecheck
  ```

- Run both linting and type checking:

  ```bash
  pnpm run quality
  ```

  Or via Makefile:

  ```bash
  make quality
  ```

#### 🧬 Testing

The project includes unit tests, integration tests, and end-to-end tests with coverage reporting.

**Unit Tests (Vitest):**

- Run unit tests:

  ```bash
  pnpm run test:unit
  ```

  Or via Makefile:

  ```bash
  make test-unit
  ```

- Run unit tests with coverage:

  ```bash
  pnpm run test:unit:coverage
  ```

  Or via Makefile:

  ```bash
  make test-unit-cov
  ```

- Run unit tests with UI:

  ```bash
  pnpm run test:unit:ui
  ```

  Or via Makefile:

  ```bash
  make test-unit-ui
  ```

**Integration Tests (Vitest):**

- Run integration tests:

  ```bash
  pnpm run test:integration
  ```

  Or via Makefile:

  ```bash
  make test-integration
  ```

- Run integration tests with coverage:

  ```bash
  pnpm run test:integration:coverage
  ```

  Or via Makefile:

  ```bash
  make test-integration-cov
  ```

- Run integration tests in watch mode:

  ```bash
  pnpm run test:integration:watch
  ```

  Or via Makefile:

  ```bash
  make test-integration-watch
  ```

**End-to-End Tests (Playwright):**

- Run E2E tests in headless mode:

  ```bash
  pnpm run test:e2e
  ```

  Or via Makefile:

  ```bash
  make test-e2e
  ```

- Run E2E tests with Playwright UI:

  ```bash
  pnpm run test:e2e:ui
  ```

  Or via Makefile:

  ```bash
  make test-e2e-ui
  ```

- Run E2E tests in headed mode (visible browser):

  ```bash
  pnpm run test:e2e:headed
  ```

  Or via Makefile:

  ```bash
  make test-e2e-headed
  ```

- View last E2E test report:

  ```bash
  pnpm run test:e2e:report
  ```

  Or via Makefile:

  ```bash
  make test-e2e-report
  ```

#### 🪝 Pre-commit Hooks

Pre-commit hooks automatically run linters and formatters before each Git commit using Husky and lint-staged.

- Pre-commit hooks are automatically installed during `pnpm install` via the `prepare` script.

- To manually trigger the pre-commit hook:

  ```bash
  pnpm run pre-commit
  ```

### 🧹 Cleanup

- Remove all cache, build artifacts, and dependencies:

  ```bash
  pnpm run clean:all
  ```

  Or via Makefile:

  ```bash
  make clean-all
  ```

- Remove build artifacts only:

  ```bash
  pnpm run clean:build
  ```

  Or via Makefile:

  ```bash
  make clean-build
  ```

- Remove `node_modules` only:

  ```bash
  pnpm run clean:deps
  ```

  Or via Makefile:

  ```bash
  make clean-deps
  ```

- Remove all Docker containers, volumes, and images:

  ```bash
  make docker-clean
  ```

---

## ✨ Features

> [!NOTE]
> This list provides only a rough overview of the system's features. The internal architecture encompasses complex asynchronous pipelines, granular state management, and strict access controls that operate far beneath the surface of these high-level descriptions.

### 🧐 Analyze

- **Multi-Step Case Creation Wizard**: A guided three-step workflow for creating forensic cases, with automatic draft persistence to `localStorage` and database-backed state recovery on page reload.
- **Case Details Form**: Users provide case metadata including case name, collection date and time, ambient temperature, and a hierarchical Philippine address through cascading dropdown selectors.
- **Automatic Weather Integration**: An optional toggle fetches the historical ambient temperature from the **Open-Meteo** archive API based on the selected case date and city, using geocoding to determine coordinates and nearest-hour matching for precision. The temperature auto-resets when the date or location changes while the toggle is active.
- **Dual Image Ingestion**: Supports both **file upload** via drag-and-drop or click-to-browse and **live camera capture** with selectable aspect ratios like Square 1:1, Landscape 16:9, and Portrait 9:16, alongside front/back camera switching and mirror/flip controls. Up to **20 images** can be provided per case, each with a maximum size of **10 MB**.
- **Supported Formats**: Accepts **JPEG**, **PNG**, **WebP**, **HEIC**, and **HEIF** image formats with binary content validation via `file-type` to detect corrupted or spoofed files, alongside MIME type checking and duplicate name rejection.
- **Client-Side Image Processing**: Uploaded images support **rotation** for 0°, 90°, 180°, and 270° via offscreen canvas processing, **renaming**, **deletion**, and **preview** in both list and grid view modes with search and sort functionality. Upload progress is tracked per file with retry support for failed uploads.
- **End-to-End Image Encryption**: All uploaded images are encrypted at rest with **AES-256 Server-Side Encryption SSE-S3** in AWS S3. Images are served exclusively through authenticated proxy routes and presigned upload URLs expire after **10 minutes**. Each S3 object stores user and case metadata for ownership verification to ensure images are accessible only to the account that uploaded them.
- **Review and Submit**: Before submission, users review a sorted image summary grid and case details summary with pre-submit Zod schema re-validation. All files must have a successful upload status and at least one image is required.
- **Asynchronous AI Analysis Pipeline**: Upon submission, an **Inngest** background event triggers the FastAPI inference engine for object detection and PMI computation with up to **3 retries**, **exponential backoff**, and a **30-minute timeout**. The case transitions through `pending` to `processing` to `completed` or `failed` statuses, with a 1-minute initial delay to allow browser uploads to finalize.
- **Real-Time Status Polling**: The client polls analysis status every **3 seconds** with contextual status messages, automatic toast notifications on completion or failure, and a redirect to the results page upon successful analysis.
- **Cancellation Support**: Users can cancel an in-progress analysis, which atomically reverts the case to draft status, deletes all detection data, removes the analysis results record, and restores the wizard to the review step.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/analyze.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

### 📊 Results

- **Case Summary Charts**: Five interactive chart types to visualize detection data including **bar chart**, **line chart**, **composed chart**, **pie chart**, and **radar chart**. Users can switch between chart types and data sources like overall aggregated, maximum stages per image, or per-image via a configurable toolbar.
- **PMI Estimation Display**: The Post-Mortem Interval estimation is displayed with animated value transitions and switchable time formats for **minutes**, **hours**, and **days** with two-decimal precision. An explanation modal provides all three calculated values, the backend-provided estimation logic, the oldest life stage detected, the Accumulated Degree Hours (ADH), Lower Developmental Threshold (LDT), and an interpretable summary string.
- **Image Viewing with Annotations**: A searchable, sortable image gallery where each image card shows a thumbnail, verification status indicator like **Verified**, **Unverified**, **In Progress** with percentage, or **No Detections**, and action buttons for view, edit, export, and delete. The full-screen image preview modal includes zoom and pan controls, color-coded bounding box overlays with adaptive stroke width based on zoom scale, tooltips showing detection label and confidence score, a minimap viewport indicator, and a scrollable thumbnail strip for navigation between images.
- **Individual Image Export**: Each image can be individually exported as either a **raw data** package containing the original image and JSON detection data in a ZIP or a **labelled image** with bounding boxes rendered at selectable resolutions like **720p**, **1080p**, or **4K**.
- **Case Editing**: A slide-out side panel with three tabs. **Details** contains editable case name, date, temperature with Celsius/Fahrenheit toggle, and cascading Philippine address fields, each with individual lock/unlock toggles. **Notes** that have rich-text editor. And **History** with auto-refreshing audit log timeline. Changes to analysis-affecting fields trigger a recalculation flag.
- **Rich-Text Note Editor**: A text editor with a full formatting toolbar supporting **bold**, **italic**, **underline**, **strikethrough**, **heading** with H1 toggle, **blockquote**, **bullet list**, **numbered list**, **checklist** with nested task list, smart typography replacements, and a **view/edit mode toggle**. Content is stored as HTML and managed through `react-hook-form`.
- **PMI Recalculation**: After editing annotations, users can trigger a PMI recalculation via a confirmation modal. The recalculation is dispatched through an Inngest background event, polled in real-time with intelligent query invalidation and retry logic, and automatically refreshes all result visualizations upon completion.
- **Case Details Display**: Six color-coded gradient cards present key case metadata including case date, temperature, region, province, city/municipality, and barangay.
- **Reviewed Images Widget**: Displays a progress count of reviewed versus total images, where only images with all detections verified.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/results.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

### ✍🏻 Editor

- **Toolbar with Mode Controls**: A floating vertical toolbar with three interaction modes including **pan** for click-and-drag panning across the image, **select** for clicking bounding boxes to select, drag to reposition, and resize via 8 directional handles constrained to image boundaries, and **draw** for click-and-drag to create new bounding boxes, defaulting to the Adult class with verified status.
- **View Controls**: Toolbar buttons for **zoom in**, **zoom out** with range from 0.1× to 100×, **center focus**, **reset view**, and a toggleable **minimap** overlay on desktop that displays a scaled-down image preview with the current viewport rectangle visible when zoom exceeds 1×.
- **Undo/Redo History**: A full undo/redo system with a **50-state history stack**, accessible via toolbar buttons or keyboard shortcuts covering all detection operations such as add, update, remove, and verify all. A **Reset Changes** button restores all annotations to their original saved state and clears the entire history.
- **Annotation Panel**: A sidebar panel displaying detection counts segmented by class with separate breakdowns for total, unverified, and verified detections.
- **Attributes Panel**: A read-only sidebar panel displaying case and image metadata including case name, image name, resolution computed from natural dimensions, case date, upload date, temperature, and the full Philippine address for Region, Province, City/Municipality, and Barangay.
- **Keyboard Shortcuts Panel**: A sidebar reference listing all available keyboard shortcuts organized by category.
- **Settings Panel with Layer Visibility**: Toggles for showing or hiding the image layer and annotation layer independently, with four view modes including **All**, **Image Only**, **Annotations Only**, and **None**.
- **Class Filters**: Per-class visibility toggles in the settings panel to show or hide specific detection classes. When all classes are hidden, the annotations layer is automatically disabled.
- **Display Filters**: Filter visible annotations by verification status including **Show All**, **Show Verified Only**, or **Show Unverified Only**.
- **Detection Panel**: A floating panel that card on desktop and bottom sheet on mobile that appears on bounding box selection.
- **Bounding Box Drawing**: New bounding boxes are drawn by clicking and dragging in draw mode. Coordinates are transformed from screen space to image pixel space. After drawing, the new detection is automatically selected and the detection panel opens.
- **Bounding Box Editing**: Selected bounding boxes can be repositioned by dragging and resized via 8 directional handles with 4 corners and 4 edges with 20 px hit zones inversely scaled by zoom. Operations are constrained to image boundaries with a minimum box size enforced. State is captured before each edit for undo support, and performance-optimized updates are used during drag operations.
- **Verification Workflow**: Detections can be individually verified from the detection panel or bulk-verified via the **Verify All Detections** button in the settings panel. Image-level verification status is computed and displayed in the header including **Verified** for all confirmed, **In Progress** for partial with percentage, **Unverified** for none confirmed, or **No Detections** each with a corresponding informational status modal.
- **Lock Mode**: A toggleable lock mode via header button or `L` key that disables all editing actions, forces pan mode, and applies visual opacity indicators to locked toolbar buttons.
- **Save System with Change Detection**: Deep comparison between original and modified annotations, with a save confirmation modal showing a diff summary of added, modified, and deleted detections. The confirmation dialog can be suppressed for future saves via a checkbox preference stored in `localStorage`.
- **Navigation Guard**: Unsaved changes trigger an "Unsaved Changes" modal when navigating away such as back navigation and image switching, offering options to **Leave** for discard changes or **Save and Leave** for persist then navigate.
- **Image Navigation**: Previous/Next image arrows in the header with a position indicator and keyboard shortcuts with `[` and `]` for switching between images without leaving the editor.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/editor.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

### 📦 Export

- **PDF Report Export**: A multi-step wizard spanning introduction, security level, password, and permissions for generating case reports. Three security modes are available such as **Standard** for an open, editable, and printable PDF, **View-Protected** which requires a password to open and view the document, and **Permissions-Protected** which restricts editing, printing, and copying with **AES-256 encryption**. Two page sizes are supported like **A4** and **Letter**.
- **Granular PDF Permissions**: When using **Permissions-Protected** mode, **10 individual permission controls** are available such as disallow printing, disallow degraded printing, disallow copying of text and images, disallow content extraction, disallow screen reader access, disallow adding comments or annotations, disallow filling forms, disallow document assembly, disallow page rotation, and disallow metadata modification with intelligent dependency enforcement between related permissions.
- **Labelled Images Export**: Generates a ZIP archive containing case images with detection bounding boxes burned in at selectable resolutions like **720p** at 1280×720, **1080p** at 1920×1080, or **4K** at 3840×2160 with optional ZIP password protection.
- **Raw Data Export**: Bundles all original case images and a detailed JSON file with complete analysis results into a ZIP archive for permanent archival and external analysis, with optional ZIP password protection.
- **ZIP Password Protection**: Both labelled images and raw data exports support optional **password-protected ZIP encryption** with a minimum password length of 8 characters, configurable through a toggle-based interface.
- **Export Status Polling**: Each export request is dispatched through an **Inngest** background job to the FastAPI backend and polled every **3 seconds** for status updates for `pending`, `processing`, `completed`, or `failed`. Completed exports are automatically downloaded via a presigned S3 URL valid for 60 seconds.
- **Recent Exports**: A running list of exports created within the last **10 minutes**, polled every 5 seconds, with toast notifications for completion or failure and duplicate-tracking to prevent redundant alerts.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/export.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

### 📈 Dashboard

- **Metrics Grid**: Six summary metric cards displayed at the top of the dashboard for **Verified Cases** representing verified out of total, **Verified Images** representing verified out of total, **Verified Detections** representing verified out of total, **Average PMI Estimation** in hours, **Average Confidence Score**, and **Correction Rate** in percentage.
- **Forensic Insights Widget**: A switchable bar chart widget with three analytical views such as **Life Stage Distribution** for detection counts per class, **PMI Distribution** for time interval frequency across cases, and **Sampling Density** for image count distribution across cases.
- **Verification Status Widget**: A switchable pie chart widget with three views such as **Case Verification Status** for verified, in progress, and unverified, **Image Verification Status**, and **Detection Verification Status** providing an at-a-glance overview of annotation review progress across all cases.
- **Quality Metrics Widget**: A multi-chart widget with three views like **Model Performance by Stage** using a line chart tracking accuracy per life stage, **User Correction Ratio** using a pie chart showing the proportion of model detections modified by users, and **Confidence Score Distribution** using a distribution chart offering insight into model accuracy and the extent of manual corrections applied to detections.
- **Case Data Table**: A fully-featured data table with 12 columns like case date, case name, verification status, PMI estimation, oldest stage used for calculation, average confidence, image count, detection count, location, and temperature supporting **column sorting**, **global text search** with highlighted matching, **column visibility toggles**, **pagination**, **row selection** via checkboxes, and **bulk delete** with password confirmation.
- **Date Range Filtering**: A URL-synchronized time period filter with preset ranges like **All-Time**, **Past Year**, **Past Month**, **Past Week** and a **custom date range** selector via a dual-month calendar picker disabling future dates. Filter state persists across navigation through query parameters.
- **Adaptive Polling**: Dashboard data updates automatically with exponential back-off polling starting with 10-second initial interval, 1.5× increase up to 30 seconds when no new data is detected, resetting to fast polling on changes, with user inactivity detection after a 2-minute threshold based on mouse, keyboard, click, and scroll events.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/dashboard.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

### 👤 Account

- **Profile Editing**: Editable account fields with individual lock/unlock toggles and save buttons for **name** with 2 to 50 characters, capitalized words, and letters, hyphens, and apostrophes only, **professional title** with 1 to 100 characters, **institution** with 1 to 150 characters, and **location** for cascading Philippine address like Region, Province, City/Municipality, Barangay. Name editing is disabled for users authenticated through social providers.
- **Profile Image Upload**: Users can upload a profile image up to **10 MB** for JPEG, PNG, WebP, HEIC, or HEIF stored in AWS S3, with a hover overlay upload interface and optimistic image display during upload.
- **Email Change**: Email address updates use a **token-based verification** flow sent to the new address, with RFC 5321 compliant validation and a maximum length of 254 characters.
- **Password Change**: A two-phase process requiring verification of the current password before unlocking the new password form. The **NIST-based** password policy enforces 12 to 128 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol, no more than 3 consecutive identical characters, no whitespace, and the new password must differ from the current one. Hidden for social provider users.
- **Two-Factor Authentication 2FA**: TOTP-based two-factor authentication with a setup flow that generates a secret, displays a scannable **QR code** via `react-qr-code`, accepts a **6-digit verification code** via `InputOTP`, and upon successful verification, presents single-use **recovery codes** in a grid with options to **copy** to clipboard, **download** as a file, or **regenerate** new codes. Users can disable 2FA with password confirmation.
- **Session Management**: A session list displaying active sessions with **browser name**, **device type**, **operating system**, **location** for city and province via IP geolocation, and **activity status** such as active now or inactive. Sessions can be individually reviewed in a detail modal and revoked, or all sessions can be signed out at once with an option to **exclude** or **include** the current session requiring password confirmation.
- **Account Deletion**: A deletion flow with separate interfaces for credential users requiring current password verification and social provider users with lock/unlock toggle. Users must type the exact phrase `"Delete this account"` as confirmation. A **30-day grace period** allows account recovery before permanent deletion, managed through Inngest background jobs with scheduled execution and farewell email notifications. Upon confirmation, the session is terminated and the user is redirected to the sign-in page.

<details>
  <summary><strong>See preview</strong></summary>
  <br />
  <video src="public/demos/account.mp4" controls width="100%">
    Your browser does not support the video tag.
  </video>
</details>

---

## 📂 Project Structure

The following subsections outline the structure of the application's source code, as well as the organization of its test suites.

### 🗂️ Source Code Structure

<details>
  <summary><strong>See code structure here</strong></summary>

```plaintext
└── 📁.husky
    ├── pre-commit
└── 📁drizzle
    └── 📁meta
        ├── _journal.json
        ├── 0000_snapshot.json
        ├── 0001_snapshot.json
        ├── 0002_snapshot.json
        ├── 0003_snapshot.json
        ├── 0004_snapshot.json
        ├── 0005_snapshot.json
        ├── 0006_snapshot.json
        ├── 0007_snapshot.json
        ├── 0008_snapshot.json
        ├── 0009_snapshot.json
        ├── 0010_snapshot.json
        ├── 0011_snapshot.json
        ├── 0012_snapshot.json
        ├── 0013_snapshot.json
        ├── 0014_snapshot.json
        ├── 0015_snapshot.json
    ├── 0000_authentication.sql
    ├── 0001_analysis.sql
    ├── 0002_case.sql
    ├── 0003_results.sql
    ├── 0004_analysis_status.sql
    ├── 0005_case_status.sql
    ├── 0006_export.sql
    ├── 0007_recalculation.sql
    ├── 0008_case_notes.sql
    ├── 0009_audit_logs.sql
    ├── 0010_export_password_protection.sql
    ├── 0011_user_profile_details.sql
    ├── 0012_two_factor_authentication.sql
    ├── 0013_sessions.sql
    ├── 0014_annotations.sql
    ├── 0015_indexes.sql
└── 📁public
    └── 📁avatars
        ├── avatar-1.svg
        ├── avatar-2.svg
        ├── avatar-3.svg
        ├── avatar-4.svg
        ├── avatar-5.svg
        ├── avatar-6.svg
        ├── avatar-7.svg
        ├── avatar-8.svg
    └── 📁demos
        ├── account.mp4
        ├── analyze.mp4
        ├── dashboard.mp4
        ├── editor.mp4
        ├── export.mp4
        ├── results.mp4
    └── 📁icons
        ├── icon-access-denied.svg
        ├── icon-error.svg
        ├── icon-fly.svg
        ├── pattern-skulls.svg
        ├── pattern-temple.svg
    └── 📁images
        ├── auth-image.jpg
        ├── background.png
        ├── chrysomya-megacephala.png
        ├── hand.png
        ├── painting-texture-overlay.png
    └── 📁logos
        ├── logo-google.svg
        ├── logo-linkedin.svg
        ├── logo-microsoft.svg
        ├── logo-orcid.svg
        ├── logo.svg
        ├── site-title.svg
    └── 📁seo
        ├── opengraph-image-v1.png
        ├── opengraph-image-v2.png
        ├── opengraph-image-v3.png
        ├── opengraph-image-v4.png
        ├── opengraph-image-v5.png
    └── 📁static
        ├── goodbye-banner.jpg
        ├── logo.png
        ├── pattern-skulls.png
        ├── pattern-temple.png
        ├── site-title.png
        ├── welcome-banner.jpg
    ├── apple-touch-icon.png
    ├── favicon-96x96.png
    ├── favicon.ico
    ├── favicon.svg
    ├── site.webmanifest
    ├── web-app-manifest-192x192.png
    ├── web-app-manifest-512x512.png
└── 📁scripts
    ├── clean.ts
    ├── fetch.ts
    ├── typecheck.ts
└── 📁src
    └── 📁app
        └── 📁(auth)
            └── 📁forgot-password
                ├── page.tsx
            └── 📁reset-password
                ├── page.tsx
            └── 📁signin
                └── 📁recovery
                    ├── page.tsx
                └── 📁two-factor
                    ├── page.tsx
                ├── page.tsx
            └── 📁signup
                ├── page.tsx
            └── 📁verification
                ├── page.tsx
            ├── layout.tsx
        └── 📁(editor)
            └── 📁results
                └── 📁[resultsId]
                    └── 📁image
                        └── 📁[imageId]
                            └── 📁edit
                                ├── page.tsx
            ├── layout.tsx
        └── 📁(private)
            └── 📁account
                ├── page.tsx
            └── 📁analyze
                ├── page.tsx
            └── 📁dashboard
                ├── page.tsx
            └── 📁results
                └── 📁[resultsId]
                    ├── page.tsx
                ├── page.tsx
            ├── layout.tsx
        └── 📁(public)
            └── 📁(legal)
                └── 📁privacy-policy
                    ├── page.tsx
                └── 📁terms-of-use
                    ├── page.tsx
                ├── layout.tsx
            ├── page.tsx
        └── 📁api
            └── 📁auth
                └── 📁[...nextauth]
                    ├── route.ts
                └── 📁check
                    ├── route.ts
            └── 📁delete-account
                ├── route.ts
            └── 📁images
                └── 📁[imageId]
                    ├── route.ts
            └── 📁inngest
                ├── route.ts
            └── 📁redis
                ├── route.ts
            └── 📁session
                ├── route.ts
            └── 📁validate
                ├── route.ts
        ├── global-error.tsx
        ├── globals.css
        ├── icon.svg
        ├── layout.tsx
        ├── not-found.tsx
        ├── robots.ts
        ├── sitemap.ts
    └── 📁components
        └── 📁providers
            ├── query-provider.tsx
            ├── session-provider.tsx
        └── 📁ui
            ├── avatar.tsx
            ├── badge.tsx
            ├── breadcrumb.tsx
            ├── button.tsx
            ├── calendar.tsx
            ├── card.tsx
            ├── checkbox.tsx
            ├── collapsible.tsx
            ├── dialog.tsx
            ├── drawer.tsx
            ├── dropdown-menu.tsx
            ├── form.tsx
            ├── input-otp.tsx
            ├── input.tsx
            ├── label.tsx
            ├── popover.tsx
            ├── radio-group.tsx
            ├── scroll-area.tsx
            ├── select.tsx
            ├── separator.tsx
            ├── sheet.tsx
            ├── sidebar.tsx
            ├── skeleton.tsx
            ├── sonner.tsx
            ├── switch.tsx
            ├── tabs.tsx
            ├── toggle-group.tsx
            ├── toggle.tsx
            ├── tooltip.tsx
        ├── app-breadcrumb.tsx
        ├── app-header.tsx
        ├── app-sidebar.tsx
        ├── custom-cursor.tsx
        ├── form-feedback.tsx
        ├── gradient-text.tsx
        ├── json-ld.tsx
        ├── location-dropdown.tsx
        ├── user-avatar.tsx
    └── 📁data
        ├── user.ts
    └── 📁db
        └── 📁schema
            ├── annotations.ts
            ├── audit-logs.ts
            ├── authentication.ts
            ├── cases.ts
            ├── enums.ts
            ├── exports.ts
            ├── index.ts
            ├── relations.ts
            ├── results.ts
            ├── sessions.ts
            ├── two-factor.ts
            ├── uploads.ts
        ├── index.ts
    └── 📁emails
        └── 📁static
            ├── goodbye-banner.jpg
            ├── logo.png
            ├── pattern-skulls.png
            ├── pattern-temple.png
            ├── site-title.png
            ├── welcome-banner.jpg
        ├── account-deletion-cancelled.tsx
        ├── account-deletion-request.tsx
        ├── account-deletion-scheduled.tsx
        ├── email-change-verification.tsx
        ├── email-updated.tsx
        ├── email-verification.tsx
        ├── forgot-password.tsx
        ├── goodbye-email.tsx
        ├── password-updated.tsx
        ├── welcome-email.tsx
    └── 📁features
        └── 📁account
            └── 📁actions
                ├── change-password.ts
                ├── disable-two-factor.ts
                ├── get-account-profile.ts
                ├── get-account-providers.ts
                ├── get-account-security.ts
                ├── get-current-session.ts
                ├── get-recovery-codes.ts
                ├── get-two-factor-status.ts
                ├── get-user-sessions.ts
                ├── mark-current-session.ts
                ├── regenerate-recovery-codes.ts
                ├── request-account-deletion.ts
                ├── request-email-change.ts
                ├── revoke-all-sessions.ts
                ├── revoke-session.ts
                ├── setup-two-factor.ts
                ├── track-session.ts
                ├── update-profile-image.ts
                ├── update-profile.ts
                ├── update-session-activity.ts
                ├── verify-current-password.ts
                ├── verify-email-change.ts
                ├── verify-two-factor.ts
            └── 📁components
                ├── account-all-sessions-modal.tsx
                ├── account-breadcrumb.tsx
                ├── account-container.tsx
                ├── account-content.tsx
                ├── account-deletion-modal.tsx
                ├── account-deletion.tsx
                ├── account-modal-footer.tsx
                ├── account-modal-header.tsx
                ├── account-navigation.tsx
                ├── account-password-input.tsx
                ├── account-profile.tsx
                ├── account-security.tsx
                ├── account-session-modal.tsx
                ├── account-sessions.tsx
                ├── account-tab-header.tsx
                ├── credentials-user-deletion.tsx
                ├── email-section.tsx
                ├── password-change-section.tsx
                ├── password-section.tsx
                ├── password-verification-section.tsx
                ├── profile-input-field.tsx
                ├── recovery-code-actions.tsx
                ├── recovery-code-grid.tsx
                ├── recovery-codes-modal.tsx
                ├── session-card.tsx
                ├── session-details-list.tsx
                ├── session-information.tsx
                ├── session-list.tsx
                ├── sign-out-all-button.tsx
                ├── sign-out-all-form.tsx
                ├── social-provider-user-deletion.tsx
                ├── two-factor-disable-modal.tsx
                ├── two-factor-enable-modal.tsx
                ├── two-factor-section.tsx
            └── 📁hooks
                ├── use-account-deletion.ts
                ├── use-account-profile.ts
                ├── use-account-security.ts
                ├── use-email-field.ts
                ├── use-form-change.ts
                ├── use-password-change.ts
                ├── use-profile-form.ts
                ├── use-profile-image.ts
                ├── use-profile-location.ts
                ├── use-recovery-codes.ts
                ├── use-revoke-session.ts
                ├── use-session-monitor.ts
                ├── use-session.ts
                ├── use-sign-out-all-sessions.ts
                ├── use-social-provider.ts
                ├── use-two-factor-auth.ts
                ├── use-two-factor-management.ts
                ├── use-two-factor-status.ts
                ├── use-update-email.ts
                ├── use-update-password.ts
                ├── use-update-profile.ts
                ├── use-user-sessions.ts
            └── 📁schemas
                ├── account.ts
            └── 📁tokens
                ├── account-deletion-token.ts
                ├── email-change-token.ts
            └── 📁utils
                ├── display-session.ts
                ├── format-date.ts
                ├── format-session.ts
                ├── parse-session.ts
        └── 📁analyze
            └── 📁actions
                ├── cancel-analysis.ts
                ├── get-case-uploads.ts
                ├── get-draft-case.ts
                ├── get-upload.ts
                ├── submit-analysis.ts
            └── 📁components
                ├── analyze-details.tsx
                ├── analyze-dynamic-metatitle.tsx
                ├── analyze-progress.tsx
                ├── analyze-review.tsx
                ├── analyze-upload.tsx
                ├── analyze-wizard.tsx
            └── 📁store
                ├── analyze-store.ts
        └── 📁annotation
            └── 📁actions
                ├── get-editor-image.ts
                ├── save-detections.ts
            └── 📁components
                ├── annotation-modal-container.tsx
                ├── annotation-modal-footer.tsx
                ├── annotation-modal-header.tsx
                ├── bounding-box-handles.tsx
                ├── bounding-box-item.tsx
                ├── details-annotation-panel.tsx
                ├── details-attributes-panel.tsx
                ├── details-settings-panel.tsx
                ├── details-shortcuts-panel.tsx
                ├── detection-panel-content.tsx
                ├── detection-panel-selector.tsx
                ├── edit-image-body.tsx
                ├── edit-image-modal.tsx
                ├── editor-bounding-box.tsx
                ├── editor-delete-image-modal.tsx
                ├── editor-details-panel.tsx
                ├── editor-detection-panel.tsx
                ├── editor-header-actions.tsx
                ├── editor-header-context.tsx
                ├── editor-header-navigation.tsx
                ├── editor-header.tsx
                ├── editor-image-display.tsx
                ├── editor-image-minimap.tsx
                ├── editor-sidebar.tsx
                ├── editor-toolbar.tsx
                ├── in-progress-status-modal.tsx
                ├── no-detections-status-modal.tsx
                ├── panel-information-row.tsx
                ├── panel-list-item.tsx
                ├── panel-section-header.tsx
                ├── reset-changes-modal.tsx
                ├── save-confirmation-modal.tsx
                ├── sidebar-navigation.tsx
                ├── sidebar-panel.tsx
                ├── toolbar-history-buttons.tsx
                ├── toolbar-mode-buttons.tsx
                ├── toolbar-view-buttons.tsx
                ├── unsaved-changes-modal.tsx
                ├── unverified-status-modal.tsx
                ├── verified-status-modal.tsx
                ├── verify-all-detections-modal.tsx
            └── 📁hooks
                ├── use-annotated-data.ts
                ├── use-bounding-box.ts
                ├── use-detection-panel.ts
                ├── use-editor-image.ts
                ├── use-editor-navigation.ts
                ├── use-editor-save-handler.ts
                ├── use-editor-sidebar.ts
                ├── use-editor-toolbar.ts
                ├── use-image-display-state.ts
                ├── use-image-drawing.ts
                ├── use-navigation-guard.ts
            └── 📁store
                ├── annotation-store.ts
            └── 📁utils
                ├── calculate-detection-changes.ts
                ├── event-coordinates.ts
                ├── lightened-color.ts
        └── 📁auth
            └── 📁actions
                ├── forgot-password.ts
                ├── recovery.ts
                ├── reset-password.ts
                ├── signin.ts
                ├── signup.ts
                ├── two-factor.ts
                ├── verification.ts
            └── 📁components
                ├── auth-form-container.tsx
                ├── auth-form-header.tsx
                ├── auth-password-input.tsx
                ├── auth-social-provider.tsx
                ├── auth-submit-button.tsx
                ├── forgot-password-form.tsx
                ├── recovery-form.tsx
                ├── reset-password-form.tsx
                ├── sign-in-form.tsx
                ├── sign-up-form.tsx
                ├── two-factor-form.tsx
                ├── verification-form.tsx
            └── 📁hooks
                ├── use-auth-state.ts
            └── 📁schemas
                ├── auth.ts
            └── 📁tokens
                ├── forgot-password-token.ts
                ├── verification-token.ts
        └── 📁cases
            └── 📁actions
                ├── create-case.ts
                ├── update-case.ts
            └── 📁components
                ├── camera-controls.tsx
                ├── camera-view.tsx
                ├── capture-image-thumbnail.tsx
                ├── capture-thumbnail-list.tsx
                ├── case-capture.tsx
                ├── case-date-input.tsx
                ├── case-details-form.tsx
                ├── case-form-actions.tsx
                ├── case-history-log.tsx
                ├── case-information-modal.tsx
                ├── case-location-input.tsx
                ├── case-name-input.tsx
                ├── case-note-editor.tsx
                ├── case-temperature-input.tsx
                ├── case-upload.tsx
                ├── edit-case-button.tsx
                ├── edit-case-form.tsx
                ├── edit-case-sheet.tsx
                ├── edit-case-tabs.tsx
                ├── history-log-empty-state.tsx
                ├── history-log-timeline-event.tsx
                ├── history-log-timeline.tsx
                ├── note-editor-content-area.tsx
                ├── note-editor-loading.tsx
                ├── note-editor-toolbar-button.tsx
                ├── note-editor-toolbar.tsx
                ├── preview-image-viewer.tsx
                ├── preview-modal-header.tsx
                ├── preview-thumbnail-list.tsx
                ├── preview-thumbnail.tsx
                ├── preview-view-controls.tsx
                ├── review-actions.tsx
                ├── review-details-summary.tsx
                ├── review-header.tsx
                ├── review-image-summary.tsx
                ├── review-processing-overlay.tsx
                ├── supported-formats-modal.tsx
            └── 📁constants
                ├── styles.ts
                ├── types.ts
            └── 📁hooks
                ├── use-analysis-submission.ts
                ├── use-analyze-review.ts
                ├── use-camera-processor.ts
                ├── use-camera-settings.ts
                ├── use-camera.ts
                ├── use-case-history.ts
                ├── use-case-note-editor.ts
                ├── use-edit-case-form.ts
                ├── use-formatted-history.ts
                ├── use-philippine-address.ts
                ├── use-selection-navigator.ts
            └── 📁schemas
                ├── case-details.ts
            └── 📁utils
                ├── weather-service.ts
        └── 📁dashboard
            └── 📁actions
                ├── delete-selected-cases.ts
                ├── get-case-data.ts
                ├── get-confidence-score-distribution.ts
                ├── get-dashboard-metrics.ts
                ├── get-life-stage-distribution.ts
                ├── get-model-performance-metrics.ts
                ├── get-pmi-distribution.ts
                ├── get-sampling-density.ts
                ├── get-user-correction-ratio.ts
                ├── get-verification-status.ts
            └── 📁components
                ├── dashboard-analysis.tsx
                ├── dashboard-bar-chart.tsx
                ├── dashboard-container.tsx
                ├── dashboard-distribution-chart.tsx
                ├── dashboard-header.tsx
                ├── dashboard-information-item.tsx
                ├── dashboard-line-chart.tsx
                ├── dashboard-metrics-grid.tsx
                ├── dashboard-modal-footer.tsx
                ├── dashboard-modal-header.tsx
                ├── dashboard-pie-chart.tsx
                ├── dashboard-skeleton.tsx
                ├── dashboard-table-columns.tsx
                ├── dashboard-table-container.tsx
                ├── dashboard-table-pagination.tsx
                ├── dashboard-table-toolbar.tsx
                ├── dashboard-table.tsx
                ├── dashboard-view.tsx
                ├── dashboard-widget-toolbar.tsx
                ├── date-range-picker.tsx
                ├── delete-selected-case-modal.tsx
                ├── forensic-insights-modal.tsx
                ├── forensic-insights-toolbar.tsx
                ├── forensic-insights-widget.tsx
                ├── quality-metrics-modal.tsx
                ├── quality-metrics-toolbar.tsx
                ├── quality-metrics-widget.tsx
                ├── table-highlighted-text.tsx
                ├── table-sortable-header.tsx
                ├── time-period-filter.tsx
                ├── verification-status-modal.tsx
                ├── verification-status-toolbar.tsx
                ├── verification-status-widget.tsx
            └── 📁hooks
                ├── use-case-data-poller.ts
                ├── use-dashboard-table.ts
                ├── use-forensic-insights-poller.ts
                ├── use-metrics-poller.ts
                ├── use-quality-metrics-poller.ts
                ├── use-verification-status-poller.ts
            └── 📁schemas
                ├── dashboard.ts
            └── 📁store
                ├── dashboard-store.ts
            └── 📁utils
                ├── date-url-sync.ts
                ├── format-date-range.ts
                ├── highlight-text.ts
        └── 📁export
            └── 📁actions
                ├── get-export-status.ts
                ├── get-recent-exports.ts
                ├── request-image-export.ts
                ├── request-results-export.ts
            └── 📁components
                ├── export-dropdown.tsx
                ├── export-image-body.tsx
                ├── export-image-modal.tsx
                ├── export-labelled-images-body.tsx
                ├── export-labelled-images-modal.tsx
                ├── export-modal-footer.tsx
                ├── export-modal-header.tsx
                ├── export-password-protection.tsx
                ├── export-pdf-modal.tsx
                ├── export-raw-data-modal.tsx
                ├── export-results-body.tsx
                ├── pdf-export-introduction-step.tsx
                ├── pdf-export-password-step.tsx
                ├── pdf-export-permissions-step.tsx
                ├── pdf-export-security-step.tsx
                ├── pdf-password-input.tsx
            └── 📁constants
                ├── pdf-options.ts
            └── 📁hooks
                ├── use-export-poller.ts
                ├── use-export-status.ts
                ├── use-pdf-export-wizard.ts
            └── 📁schemas
                ├── export.ts
        └── 📁home
            └── 📁components
                ├── hero.tsx
                ├── navigation-bar.tsx
        └── 📁images
            └── 📁actions
                ├── delete-image.ts
                ├── get-image-url.ts
                ├── rename-image.ts
            └── 📁components
                ├── delete-image-modal.tsx
                ├── image-card.tsx
                ├── image-grid.tsx
                ├── image-toolbar.tsx
                ├── results-bounding-box.tsx
                ├── results-image-viewer.tsx
                ├── results-images-minimap.tsx
                ├── results-images-modal.tsx
                ├── results-images.tsx
                ├── results-thumbnail-list.tsx
                ├── results-thumbnail.tsx
            └── 📁hooks
                ├── use-preview-actions.ts
                ├── use-preview-editing.ts
                ├── use-preview-file-state.ts
                ├── use-preview-image.ts
                ├── use-preview-modal.ts
                ├── use-preview-mutations.ts
                ├── use-preview-navigation.ts
                ├── use-preview-rotation.ts
                ├── use-preview-transform.ts
                ├── use-rendered-image.ts
                ├── use-results-image-viewer.ts
                ├── use-results-images.ts
        └── 📁legal
            └── 📁components
                ├── privacy-collection.tsx
                ├── privacy-contact.tsx
                ├── privacy-cookies.tsx
                ├── privacy-definitions.tsx
                ├── privacy-disclosure.tsx
                ├── privacy-introduction.tsx
                ├── privacy-policy.tsx
                ├── privacy-retention.tsx
                ├── privacy-rights.tsx
                ├── privacy-security.tsx
                ├── privacy-usage.tsx
                ├── table-of-contents.tsx
                ├── terms-acceptance.tsx
                ├── terms-aup.tsx
                ├── terms-changes.tsx
                ├── terms-contact.tsx
                ├── terms-description.tsx
                ├── terms-disclaimer.tsx
                ├── terms-governing-law.tsx
                ├── terms-indemnification.tsx
                ├── terms-ip-rights.tsx
                ├── terms-liability.tsx
                ├── terms-of-use.tsx
                ├── terms-severability.tsx
                ├── terms-user-accounts.tsx
            └── 📁hooks
                ├── use-active-section.ts
        └── 📁results
            └── 📁actions
                ├── delete-case.ts
                ├── get-analysis-status.ts
                ├── get-case-by-id.ts
                ├── get-case-history.ts
                ├── get-case-name.ts
                ├── get-cases.ts
                ├── get-recalculation-status.ts
                ├── rename-case.ts
                ├── request-recalculation.ts
            └── 📁components
                ├── case-item-actions.tsx
                ├── case-item-content.tsx
                ├── case-item-dropdown.tsx
                ├── case-item.tsx
                ├── case-list.tsx
                ├── case-summary-information-modal.tsx
                ├── delete-case-modal.tsx
                ├── edit-case-sheet-footer.tsx
                ├── edit-case-sheet-header.tsx
                ├── pmi-explanation-modal.tsx
                ├── pmi-widget-toolbar.tsx
                ├── pmi-widget.tsx
                ├── results-analysis.tsx
                ├── results-bar-chart.tsx
                ├── results-breadcrumb.tsx
                ├── results-composed-chart.tsx
                ├── results-container.tsx
                ├── results-details.tsx
                ├── results-empty-state.tsx
                ├── results-header-skeleton.tsx
                ├── results-header.tsx
                ├── results-line-chart.tsx
                ├── results-modal-header.tsx
                ├── results-no-search-results.tsx
                ├── results-pie-chart.tsx
                ├── results-preview.tsx
                ├── results-radar-chart.tsx
                ├── results-recalculate-button.tsx
                ├── results-recalculate-modal.tsx
                ├── results-skeleton.tsx
                ├── results-toolbar.tsx
                ├── results-view-controls.tsx
                ├── results-view.tsx
                ├── reviewed-images-widget.tsx
                ├── summary-chart-toolbar.tsx
                ├── summary-chart-widget.tsx
                ├── verification-indicator.tsx
            └── 📁hooks
                ├── use-analysis-status.ts
                ├── use-case-data.ts
                ├── use-case-name.ts
                ├── use-cases.ts
                ├── use-list-navigation.ts
                ├── use-recalculation-poller.ts
            └── 📁store
                ├── results-store.ts
        └── 📁upload
            └── 📁actions
                ├── create-upload.ts
                ├── delete-upload.ts
                ├── rename-upload.ts
                ├── save-upload.ts
                ├── update-upload.ts
            └── 📁components
                ├── upload-dropzone.tsx
                ├── upload-file-item.tsx
                ├── upload-file-list.tsx
                ├── upload-form-actions.tsx
                ├── upload-form-header.tsx
                ├── upload-method-tabs.tsx
                ├── upload-no-results.tsx
                ├── upload-preview-minimap.tsx
                ├── upload-preview-modal.tsx
                ├── upload-preview.tsx
                ├── upload-status-icon.tsx
                ├── upload-thumbnail.tsx
                ├── upload-toolbar.tsx
            └── 📁hooks
                ├── use-client-file-processor.ts
                ├── use-file-processor.ts
            └── 📁schemas
                ├── upload.ts
    └── 📁hooks
        ├── use-media-query.ts
        ├── use-mobile.ts
    └── 📁inngest
        └── 📁account
            ├── deletion.ts
            ├── email.ts
            ├── index.ts
            ├── password.ts
        └── 📁analysis
            ├── index.ts
            ├── process.ts
            ├── recalculate.ts
        └── 📁export
            ├── case.ts
            ├── image.ts
            ├── index.ts
        └── 📁session
            ├── cleanup.ts
            ├── inactivity.ts
            ├── index.ts
            ├── maintenance.ts
            ├── redis.ts
            ├── scheduling.ts
            ├── tracking.ts
        ├── functions.ts
    └── 📁lib
        ├── auth.ts
        ├── aws.ts
        ├── config.ts
        ├── constants.ts
        ├── crypto.ts
        ├── edge-session.ts
        ├── env.ts
        ├── inngest.ts
        ├── logger.ts
        ├── mail.ts
        ├── rate-limiter.ts
        ├── redis-session.ts
        ├── resend.ts
        ├── tokens.ts
        ├── two-factor.ts
        ├── utils.ts
    └── 📁stores
        ├── layout-store.ts
    └── 📁types
        ├── global.d.ts
    ├── auth.ts
    ├── instrumentation-client.ts
    ├── instrumentation.ts
    ├── middleware.ts
    ├── routes.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .markdownlint.json
├── .prettierrc
├── CODE_OF_CONDUCT.md
├── components.json
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.mjs
├── LICENSE
├── Makefile
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
├── sentry.edge.config.ts
├── sentry.server.config.ts
└── tsconfig.json
```

</details>

### 📝 Unit Test Structure

The project includes unit tests with coverage reporting.

> [!TIP]
> For instructions on running unit tests, see the [testing](#-testing) section in Getting Started. For the complete list of test commands, see the [`package.json`](package.json) file.

<details>
  <summary><strong>See code structure here</strong></summary>

```plaintext
└── 📁.husky
    ├── pre-commit
└── 📁scripts
    ├── clean.ts
    ├── fetch.ts
    ├── typecheck.ts
└── 📁src
    └── 📁__tests__
        └── 📁mocks
            └── 📁database
                └── 📁queries
                    ├── account.queries.ts
                    ├── auth.queries.ts
                    ├── cases.queries.ts
                    ├── exports.queries.ts
                    ├── index.ts
                    ├── results.queries.ts
                ├── index.ts
                ├── mock.ts
                ├── operations.ts
                ├── store.ts
                ├── types.ts
                ├── utils.ts
            └── 📁fixtures
                ├── analysis.fixtures.ts
                ├── auth.fixtures.ts
                ├── cases.fixtures.ts
                ├── dashboard.fixtures.ts
                ├── dates.fixtures.ts
                ├── detections.fixtures.ts
                ├── exports.fixtures.ts
                ├── ids.fixtures.ts
                ├── index.ts
                ├── locations.fixtures.ts
                ├── sessions.fixtures.ts
                ├── uploads.fixtures.ts
                ├── users.fixtures.ts
            └── 📁handlers
                ├── account.handlers.ts
                ├── analyze.handlers.ts
                ├── annotation.handlers.ts
                ├── auth.handlers.ts
                ├── cases.handlers.ts
                ├── dashboard.handlers.ts
                ├── export.handlers.ts
                ├── images.handlers.ts
                ├── index.ts
                ├── results.handlers.ts
                ├── upload.handlers.ts
            ├── server.ts
        └── 📁setup
            ├── setup.ts
            ├── test-utils.tsx
    └── 📁features
        └── 📁account
            └── 📁actions
                ├── change-password.test.ts
                ├── disable-two-factor.test.ts
                ├── get-account-profile.test.ts
                ├── get-account-providers.test.ts
                ├── get-account-security.test.ts
                ├── get-current-session.test.ts
                ├── get-recovery-codes.test.ts
                ├── get-two-factor-status.test.ts
                ├── get-user-sessions.test.ts
                ├── mark-current-session.test.ts
                ├── regenerate-recovery-codes.test.ts
                ├── request-account-deletion.test.ts
                ├── request-email-change.test.ts
                ├── revoke-all-sessions.test.ts
                ├── revoke-session.test.ts
                ├── setup-two-factor.test.ts
                ├── track-session.test.ts
                ├── update-profile-image.test.ts
                ├── update-profile.test.ts
                ├── update-session-activity.test.ts
                ├── verify-current-password.test.ts
                ├── verify-email-change.test.ts
                ├── verify-two-factor.test.ts
            └── 📁components
                ├── account-all-sessions-modal.test.tsx
                ├── account-breadcrumb.test.tsx
                ├── account-container.test.tsx
                ├── account-content.test.tsx
                ├── account-deletion-modal.test.tsx
                ├── account-deletion.test.tsx
                ├── account-modal-footer.test.tsx
                ├── account-modal-header.test.tsx
                ├── account-navigation.test.tsx
                ├── account-password-input.test.tsx
                ├── account-profile.test.tsx
                ├── account-security.test.tsx
                ├── account-session-modal.test.tsx
                ├── account-sessions.test.tsx
                ├── account-tab-header.test.tsx
                ├── credentials-user-deletion.test.tsx
                ├── email-section.test.tsx
                ├── password-change-section.test.tsx
                ├── password-section.test.tsx
                ├── password-verification-section.test.tsx
                ├── profile-input-field.test.tsx
                ├── recovery-code-actions.test.tsx
                ├── recovery-code-grid.test.tsx
                ├── recovery-codes-modal.test.tsx
                ├── session-card.test.tsx
                ├── session-details-list.test.tsx
                ├── session-information.test.tsx
                ├── session-list.test.tsx
                ├── sign-out-all-button.test.tsx
                ├── sign-out-all-form.test.tsx
                ├── social-provider-user-deletion.test.tsx
                ├── two-factor-disable-modal.test.tsx
                ├── two-factor-enable-modal.test.tsx
                ├── two-factor-section.test.tsx
            └── 📁hooks
                ├── use-account-deletion.test.tsx
                ├── use-account-profile.test.tsx
                ├── use-account-security.test.tsx
                ├── use-email-field.test.tsx
                ├── use-form-change.test.tsx
                ├── use-password-change.test.tsx
                ├── use-profile-form.test.tsx
                ├── use-profile-image.test.tsx
                ├── use-profile-location.test.tsx
                ├── use-recovery-codes.test.tsx
                ├── use-revoke-session.test.tsx
                ├── use-session-monitor.test.ts
                ├── use-session.test.tsx
                ├── use-sign-out-all-sessions.test.tsx
                ├── use-social-provider.test.ts
                ├── use-two-factor-auth.test.tsx
                ├── use-two-factor-management.test.tsx
                ├── use-two-factor-status.test.tsx
                ├── use-update-email.test.tsx
                ├── use-update-password.test.tsx
                ├── use-update-profile.test.tsx
                ├── use-user-sessions.test.tsx
            └── 📁schemas
                ├── account.test.ts
            └── 📁tokens
                ├── account-deletion-token.test.ts
                ├── email-change-token.test.ts
            └── 📁utils
                ├── display-session.test.ts
                ├── format-date.test.ts
                ├── format-session.test.ts
                ├── parse-session.test.ts
        └── 📁analyze
            └── 📁actions
                ├── cancel-analysis.test.ts
                ├── get-case-uploads.test.ts
                ├── get-draft-case.test.ts
                ├── get-upload.test.ts
                ├── submit-analysis.test.ts
            └── 📁components
                ├── analyze-details.test.tsx
                ├── analyze-dynamic-metatitle.test.tsx
                ├── analyze-progress.test.tsx
                ├── analyze-review.test.tsx
                ├── analyze-upload.test.tsx
                ├── analyze-wizard.test.tsx
            └── 📁store
                ├── analyze-store.test.ts
        └── 📁annotation
            └── 📁actions
                ├── get-editor-image.test.ts
                ├── save-detections.test.ts
            └── 📁components
                ├── annotation-modal-container.test.tsx
                ├── annotation-modal-footer.test.tsx
                ├── annotation-modal-header.test.tsx
                ├── bounding-box-handles.test.tsx
                ├── bounding-box-item.test.tsx
                ├── details-annotation-panel.test.tsx
                ├── details-attributes-panel.test.tsx
                ├── details-settings-panel.test.tsx
                ├── details-shortcuts-panel.test.tsx
                ├── detection-panel-content.test.tsx
                ├── detection-panel-selector.test.tsx
                ├── edit-image-body.test.tsx
                ├── edit-image-modal.test.tsx
                ├── editor-bounding-box.test.tsx
                ├── editor-delete-image-modal.test.tsx
                ├── editor-details-panel.test.tsx
                ├── editor-detection-panel.test.tsx
                ├── editor-header-actions.test.tsx
                ├── editor-header-context.test.tsx
                ├── editor-header-navigation.test.tsx
                ├── editor-header.test.tsx
                ├── editor-image-display.test.tsx
                ├── editor-image-minimap.test.tsx
                ├── editor-sidebar.test.tsx
                ├── editor-toolbar.test.tsx
                ├── in-progress-status-modal.test.tsx
                ├── no-detections-status-modal.test.tsx
                ├── panel-information-row.test.tsx
                ├── panel-list-item.test.tsx
                ├── panel-section-header.test.tsx
                ├── reset-changes-modal.test.tsx
                ├── save-confirmation-modal.test.tsx
                ├── sidebar-navigation.test.tsx
                ├── sidebar-panel.test.tsx
                ├── toolbar-history-buttons.test.tsx
                ├── toolbar-mode-buttons.test.tsx
                ├── toolbar-view-buttons.test.tsx
                ├── unsaved-changes-modal.test.tsx
                ├── unverified-status-modal.test.tsx
                ├── verified-status-modal.test.tsx
                ├── verify-all-detections-modal.test.tsx
            └── 📁hooks
                ├── use-annotated-data.test.tsx
                ├── use-bounding-box.test.ts
                ├── use-detection-panel.test.ts
                ├── use-editor-image.test.ts
                ├── use-editor-navigation.test.ts
                ├── use-editor-save-handler.test.tsx
                ├── use-editor-sidebar.test.ts
                ├── use-editor-toolbar.test.ts
                ├── use-image-display-state.test.ts
                ├── use-image-drawing.test.ts
                ├── use-navigation-guard.test.ts
            └── 📁store
                ├── annotation-store.test.ts
            └── 📁utils
                ├── calculate-detection-changes.test.ts
                ├── event-coordinates.test.ts
                ├── lightened-color.test.ts
        └── 📁auth
            └── 📁actions
                ├── forgot-password.test.ts
                ├── recovery.test.ts
                ├── reset-password.test.ts
                ├── signin.test.ts
                ├── signup.test.ts
                ├── two-factor.test.ts
                ├── verification.test.ts
            └── 📁components
                ├── auth-form-container.test.tsx
                ├── auth-form-header.test.tsx
                ├── auth-password-input.test.tsx
                ├── auth-social-provider.test.tsx
                ├── auth-submit-button.test.tsx
                ├── forgot-password-form.test.tsx
                ├── recovery-form.test.tsx
                ├── reset-password-form.test.tsx
                ├── sign-in-form.test.tsx
                ├── sign-up-form.test.tsx
                ├── two-factor-form.test.tsx
                ├── verification-form.test.tsx
            └── 📁hooks
                ├── use-auth-state.test.ts
            └── 📁schemas
                ├── auth.test.ts
            └── 📁tokens
                ├── forgot-password-token.test.ts
                ├── verification-token.test.ts
        └── 📁cases
            └── 📁actions
                ├── create-case.test.ts
                ├── update-case.test.ts
            └── 📁components
                ├── camera-controls.test.tsx
                ├── camera-view.test.tsx
                ├── capture-image-thumbnail.test.tsx
                ├── capture-thumbnail-list.test.tsx
                ├── case-capture.test.tsx
                ├── case-date-input.test.tsx
                ├── case-details-form.test.tsx
                ├── case-form-actions.test.tsx
                ├── case-history-log.test.tsx
                ├── case-information-modal.test.tsx
                ├── case-location-input.test.tsx
                ├── case-name-input.test.tsx
                ├── case-note-editor.test.tsx
                ├── case-temperature-input.test.tsx
                ├── case-upload.test.tsx
                ├── edit-case-button.test.tsx
                ├── edit-case-form.test.tsx
                ├── edit-case-sheet.test.tsx
                ├── edit-case-sheet.tsx
                ├── edit-case-tabs.test.tsx
                ├── history-log-empty-state.test.tsx
                ├── history-log-timeline-event.test.tsx
                ├── history-log-timeline.test.tsx
                ├── note-editor-content-area.test.tsx
                ├── note-editor-loading.test.tsx
                ├── note-editor-toolbar-button.test.tsx
                ├── note-editor-toolbar.test.tsx
                ├── preview-image-viewer.test.tsx
                ├── preview-modal-header.test.tsx
                ├── preview-thumbnail-list.test.tsx
                ├── preview-thumbnail.test.tsx
                ├── preview-view-controls.test.tsx
                ├── review-actions.test.tsx
                ├── review-details-summary.test.tsx
                ├── review-header.test.tsx
                ├── review-image-summary.test.tsx
                ├── review-processing-overlay.test.tsx
                ├── supported-formats-modal.test.tsx
            └── 📁hooks
                ├── use-analysis-submission.test.tsx
                ├── use-analyze-review.test.ts
                ├── use-camera-processor.test.ts
                ├── use-camera-settings.test.ts
                ├── use-camera.test.ts
                ├── use-case-history.test.tsx
                ├── use-case-note-editor.test.ts
                ├── use-edit-case-form.test.tsx
                ├── use-formatted-history.test.ts
                ├── use-philippine-address.test.ts
                ├── use-selection-navigation.test.ts
            └── 📁schemas
                ├── case-details.test.ts
            └── 📁utils
                ├── weather-service.test.ts
        └── 📁dashboard
            └── 📁actions
                ├── delete-selected-cases.test.ts
                ├── get-case-data.test.ts
                ├── get-confidence-score-distribution.test.ts
                ├── get-dashboard-metrics.test.ts
                ├── get-life-stage-distribution.test.ts
                ├── get-model-performance-metrics.test.ts
                ├── get-pmi-distribution.test.ts
                ├── get-sampling-density.test.ts
                ├── get-user-correction-ratio.test.ts
                ├── get-verification-status.test.ts
            └── 📁components
                ├── dashboard-analysis.test.tsx
                ├── dashboard-bar-chart.test.tsx
                ├── dashboard-container.test.tsx
                ├── dashboard-distribution-chart.test.tsx
                ├── dashboard-header.test.tsx
                ├── dashboard-information-item.test.tsx
                ├── dashboard-line-chart.test.tsx
                ├── dashboard-metrics-grid.test.tsx
                ├── dashboard-modal-footer.test.tsx
                ├── dashboard-modal-header.test.tsx
                ├── dashboard-pie-chart.test.tsx
                ├── dashboard-skeleton.test.tsx
                ├── dashboard-table-columns.test.tsx
                ├── dashboard-table-container.test.tsx
                ├── dashboard-table-pagination.test.tsx
                ├── dashboard-table-toolbar.test.tsx
                ├── dashboard-table.test.tsx
                ├── dashboard-view.test.tsx
                ├── dashboard-widget-toolbar.test.tsx
                ├── date-range-picker.test.tsx
                ├── delete-selected-case-modal.test.tsx
                ├── forensic-insights-modal.test.tsx
                ├── forensic-insights-toolbar.test.tsx
                ├── forensic-insights-widget.test.tsx
                ├── quality-metrics-modal.test.tsx
                ├── quality-metrics-toolbar.test.tsx
                ├── quality-metrics-widget.test.tsx
                ├── table-highlighted-text.test.tsx
                ├── table-sortable-header.test.tsx
                ├── time-period-filter.test.tsx
                ├── verification-status-modal.test.tsx
                ├── verification-status-toolbar.test.tsx
                ├── verification-status-widget.test.tsx
            └── 📁hooks
                ├── use-case-data-poller.test.tsx
                ├── use-dashboard-table.test.tsx
                ├── use-forensic-insights-poller.test.tsx
                ├── use-metrics-poller.test.tsx
                ├── use-quality-metrics-poller.test.tsx
                ├── use-verification-status-poller.test.tsx
            └── 📁schemas
                ├── dashboard.test.ts
            └── 📁store
                ├── dashboard-store.test.ts
            └── 📁utils
                ├── date-url-sync.test.ts
                ├── format-date-range.test.ts
                ├── highlight-text.test.ts
        └── 📁export
            └── 📁actions
                ├── get-export-status.test.ts
                ├── get-recent-exports.test.ts
                ├── request-image-export.test.ts
                ├── request-results-export.test.ts
            └── 📁components
                ├── export-dropdown.test.tsx
                ├── export-image-body.test.tsx
                ├── export-image-modal.test.tsx
                ├── export-labelled-images-body.test.tsx
                ├── export-labelled-images-modal.test.tsx
                ├── export-modal-footer.test.tsx
                ├── export-modal-header.test.tsx
                ├── export-password-protection.test.tsx
                ├── export-pdf-modal.test.tsx
                ├── export-raw-data-modal.test.tsx
                ├── export-results-body.test.tsx
                ├── pdf-export-introduction-step.test.tsx
                ├── pdf-export-password-step.test.tsx
                ├── pdf-export-permissions-step.test.tsx
                ├── pdf-export-security-step.test.tsx
                ├── pdf-password-input.test.tsx
            └── 📁constants
                ├── pdf-options.test.ts
            └── 📁hooks
                ├── use-export-poller.test.tsx
                ├── use-export-status.test.tsx
                ├── use-pdf-export-wizard.test.tsx
            └── 📁schemas
                ├── export.test.ts
        └── 📁home
            └── 📁components
                ├── hero.tsx
                ├── navigation-bar.tsx
        └── 📁images
            └── 📁actions
                ├── delete-image.test.ts
                ├── get-image-url.test.ts
                ├── rename-image.test.ts
            └── 📁components
                ├── delete-image-modal.test.tsx
                ├── image-card.test.tsx
                ├── image-grid.test.tsx
                ├── image-toolbar.test.tsx
                ├── results-bounding-box.test.tsx
                ├── results-image-viewer.test.tsx
                ├── results-images-minimap.test.tsx
                ├── results-images-modal.test.tsx
                ├── results-images.test.tsx
                ├── results-thumbnail-list.test.tsx
                ├── results-thumbnail.test.tsx
            └── 📁hooks
                ├── use-preview-actions.test.tsx
                ├── use-preview-editing.test.ts
                ├── use-preview-file-state.test.ts
                ├── use-preview-image.test.ts
                ├── use-preview-modal.test.ts
                ├── use-preview-mutations.test.tsx
                ├── use-preview-navigation.test.ts
                ├── use-preview-rotation.test.ts
                ├── use-preview-transform.test.ts
                ├── use-rendered-image.test.ts
                ├── use-results-image-viewer.test.ts
                ├── use-results-images.test.ts
        └── 📁results
            └── 📁actions
                ├── delete-case.test.ts
                ├── get-analysis-status.test.ts
                ├── get-case-by-id.test.ts
                ├── get-case-history.test.ts
                ├── get-case-name.test.ts
                ├── get-cases.test.ts
                ├── get-recalculation-status.test.ts
                ├── rename-case.test.ts
                ├── request-recalculation.test.ts
            └── 📁components
                ├── case-item-actions.test.tsx
                ├── case-item-content.test.tsx
                ├── case-item-dropdown.test.tsx
                ├── case-item.test.tsx
                ├── case-list.test.tsx
                ├── case-summary-information-modal.test.tsx
                ├── delete-case-modal.test.tsx
                ├── edit-case-sheet-footer.test.tsx
                ├── edit-case-sheet-header.test.tsx
                ├── pmi-explanation-modal.test.tsx
                ├── pmi-widget-toolbar.test.tsx
                ├── pmi-widget.test.tsx
                ├── results-analysis.test.tsx
                ├── results-bar-chart.test.tsx
                ├── results-breadcrumb.test.tsx
                ├── results-composed-chart.test.tsx
                ├── results-container.test.tsx
                ├── results-details.test.tsx
                ├── results-empty-state.test.tsx
                ├── results-header-skeleton.test.tsx
                ├── results-header.test.tsx
                ├── results-line-chart.test.tsx
                ├── results-modal-header.test.tsx
                ├── results-no-search-results.test.tsx
                ├── results-pie-chart.test.tsx
                ├── results-preview.test.tsx
                ├── results-radar-chart.test.tsx
                ├── results-recalculate-button.test.tsx
                ├── results-recalculate-modal.test.tsx
                ├── results-skeleton.test.tsx
                ├── results-toolbar.test.tsx
                ├── results-view-controls.test.tsx
                ├── results-view.test.tsx
                ├── reviewed-images-widget.test.tsx
                ├── summary-chart-toolbar.test.tsx
                ├── summary-chart-widget.test.tsx
                ├── verification-indicator.test.tsx
            └── 📁hooks
                ├── use-analysis-status.test.tsx
                ├── use-case-data.test.tsx
                ├── use-case-name.test.tsx
                ├── use-cases.test.tsx
                ├── use-list-navigation.test.ts
                ├── use-recalculation-poller.test.tsx
            └── 📁store
                ├── results-store.test.ts
        └── 📁upload
            └── 📁actions
                ├── create-upload.test.ts
                ├── delete-upload.test.ts
                ├── rename-upload.test.ts
                ├── save-upload.test.ts
                ├── update-upload.test.ts
            └── 📁components
                ├── upload-dropdzone.test.tsx
                ├── upload-file-item.test.tsx
                ├── upload-file-list.test.tsx
                ├── upload-form-actions.test.tsx
                ├── upload-form-header.test.tsx
                ├── upload-method-tabs.test.tsx
                ├── upload-no-results.test.tsx
                ├── upload-preview-minimap.test.tsx
                ├── upload-preview-modal.test.tsx
                ├── upload-preview.test.tsx
                ├── upload-status-icon.test.tsx
                ├── upload-thumbnail.test.tsx
                ├── upload-toolbar.test.tsx
            └── 📁hooks
                ├── use-client-file-processor.test.ts
                ├── use-file-processor.test.ts
            └── 📁schemas
                ├── upload.test.ts
    └── 📁stores
        ├── layout-store.test.tsx
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc
├── CODE_OF_CONDUCT.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── LICENSE
├── Makefile
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
└── vitest.config.ts
```

</details>

### 📋 Integration Test Structure

The project includes integration tests to ensure interaction between different modules and the database layer.

> [!TIP]
> For instructions on running integration tests, see the [Testing](#-testing) section in Getting Started. For the complete list of test commands, see the [`package.json`](package.json) file.

<details>
  <summary><strong>See code structure here</strong></summary>

```plaintext
└── 📁.husky
    ├── pre-commit
└── 📁scripts
    ├── clean.ts
    ├── fetch.ts
    ├── typecheck.ts
└── 📁src
    └── 📁__tests__
        └── 📁integration
            └── 📁account
                └── 📁actions
                    ├── change-password.integration.test.ts
                    ├── disable-two-factor.integration.test.ts
                    ├── get-account-profile.integration.test.ts
                    ├── get-account-providers.integration.test.ts
                    ├── get-account-security.integration.test.ts
                    ├── get-current-session.integration.test.ts
                    ├── get-recovery-codes.integration.test.ts
                    ├── get-two-factor-status.integration.test.ts
                    ├── get-user-sessions.integration.test.ts
                    ├── mark-current-session.integration.test.ts
                    ├── regenerate-recovery-codes.integration.test.ts
                    ├── request-account-deletion.integration.test.ts
                    ├── request-email-change.integration.test.ts
                    ├── revoke-all-sessions.integration.test.ts
                    ├── revoke-session.integration.test.ts
                    ├── setup-two-factor.integration.test.ts
                    ├── track-session.integration.test.ts
                    ├── update-profile-image.integration.test.ts
                    ├── update-profile.integration.test.ts
                    ├── update-session-activity.integration.test.ts
                    ├── verify-current-password.integration.test.ts
                    ├── verify-email-change.integration.test.ts
                    ├── verify-two-factor.integration.test.ts
                └── 📁tokens
                    ├── account-deletion-token.integration.test.ts
                    ├── email-change-token.integration.test.ts
            └── 📁analyze
                └── 📁actions
                    ├── cancel-analysis.integration.test.ts
                    ├── get-case-uploads.integration.test.ts
                    ├── get-draft-case.integration.test.ts
                    ├── get-upload.integration.test.ts
                    ├── submit-analysis.integration.test.ts
            └── 📁annotation
                └── 📁actions
                    ├── get-editor-image.integration.test.ts
                    ├── save-detections.integration.test.ts
            └── 📁auth
                └── 📁actions
                    ├── forgot-password.integration.test.ts
                    ├── recovery.integration.test.ts
                    ├── reset-password.integration.test.ts
                    ├── signin.integration.test.ts
                    ├── signup.integration.test.ts
                    ├── two-factor.integration.test.ts
                    ├── verification.integration.test.ts
                └── 📁tokens
                    ├── forgot-password-token.integration.test.ts
                    ├── verification-token.integration.test.ts
            └── 📁cases
                └── 📁actions
                    ├── create-case.integration.test.ts
                    ├── update-case.integration.test.ts
                └── 📁utils
                    ├── weather-service.integration.test.ts
            └── 📁dashboard
                └── 📁actions
                    ├── delete-selected-cases.integration.test.ts
                    ├── get-case-data.integration.test.ts
                    ├── get-confidence-score-distribution.integration.test.ts
                    ├── get-dashboard-metrics.integration.test.ts
                    ├── get-life-stage-distribution.integration.test.ts
                    ├── get-model-performance-metrics.integration.test.ts
                    ├── get-pmi-distribution.integration.test.ts
                    ├── get-sampling-density.integration.test.ts
                    ├── get-user-correction-ratio.integration.test.ts
                    ├── get-verification-status.integration.test.ts
            └── 📁export
                └── 📁actions
                    ├── get-export-status.integration.test.ts
                    ├── get-recent-exports.integration.test.ts
                    ├── request-image-export.integration.test.ts
                    ├── request-results-export.integration.test.ts
            └── 📁images
                └── 📁actions
                    ├── delete-image.integration.test.ts
                    ├── get-image-url.integration.test.ts
                    ├── rename-image.integration.test.ts
            └── 📁results
                └── 📁actions
                    ├── delete-case.integration.test.ts
                    ├── get-analysis-status.integration.test.ts
                    ├── get-case-by-id.integration.test.ts
                    ├── get-case-history.integration.test.ts
                    ├── get-case-name.integration.test.ts
                    ├── get-cases.integration.test.ts
                    ├── get-recalculation-status.integration.test.ts
                    ├── rename-case.integration.test.ts
                    ├── request-recalculation.integration.test.ts
            └── 📁upload
                └── 📁actions
                    ├── create-upload.integration.test.ts
                    ├── delete-upload.integration.test.ts
                    ├── rename-upload.integration.test.ts
                    ├── save-upload.integration.test.ts
                    ├── update-upload.integration.test.ts
        └── 📁mocks
            └── 📁database
                └── 📁queries
                    ├── account.queries.ts
                    ├── auth.queries.ts
                    ├── cases.queries.ts
                    ├── exports.queries.ts
                    ├── index.ts
                    ├── results.queries.ts
                ├── index.ts
                ├── mock.ts
                ├── operations.ts
                ├── store.ts
                ├── types.ts
                ├── utils.ts
            └── 📁fixtures
                ├── analysis.fixtures.ts
                ├── auth.fixtures.ts
                ├── cases.fixtures.ts
                ├── dashboard.fixtures.ts
                ├── dates.fixtures.ts
                ├── detections.fixtures.ts
                ├── exports.fixtures.ts
                ├── ids.fixtures.ts
                ├── index.ts
                ├── locations.fixtures.ts
                ├── sessions.fixtures.ts
                ├── uploads.fixtures.ts
                ├── users.fixtures.ts
            └── 📁handlers
                ├── account.handlers.ts
                ├── analyze.handlers.ts
                ├── annotation.handlers.ts
                ├── auth.handlers.ts
                ├── cases.handlers.ts
                ├── dashboard.handlers.ts
                ├── export.handlers.ts
                ├── images.handlers.ts
                ├── index.ts
                ├── results.handlers.ts
                ├── upload.handlers.ts
            ├── server.ts
        └── 📁setup
            ├── setup.ts
            ├── test-utils.tsx
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc
├── CODE_OF_CONDUCT.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── LICENSE
├── Makefile
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
└── vitest.config.ts
```

</details>

---
