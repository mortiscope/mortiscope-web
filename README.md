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
