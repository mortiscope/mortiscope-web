.PHONY: help \
	dev dev-webpack dev-email \
	build build-webpack build-validate build-production build-analyze \
	start \
	lint lint-fix typecheck quality quality-fix \
	test test-unit test-unit-ui test-unit-cov \
	test-integration test-integration-watch test-integration-ui test-integration-cov \
	test-e2e test-e2e-ui test-e2e-headed test-e2e-report test-e2e-debug test-e2e-seed \
	db-push db-generate db-studio \
	fetch geoip-update \
	audit audit-fix deps-check deps-update \
	bundle-analyze bundle-size lighthouse \
	clean clean-build clean-deps clean-all \
	docker-build docker-up docker-down docker-logs docker-shell docker-clean

# Displays a help menu listing all available commands and their descriptions.
help:
	@echo "MortiScope Web - Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev                  Start dev server (Turbo) with Inngest"
	@echo "  make dev-webpack          Start dev server with Webpack (no Turbo)"
	@echo "  make dev-email            Start React Email preview server"
	@echo ""
	@echo "Build:"
	@echo "  make build                Build with Turbo"
	@echo "  make build-webpack        Build with Webpack"
	@echo "  make build-validate       Run quality checks then build"
	@echo "  make build-production     Production build with validation"
	@echo "  make build-analyze        Build with bundle analyzer"
	@echo "  make start                Start the production server"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint                 Check code with ESLint (strict)"
	@echo "  make lint-fix             Auto-fix ESLint issues"
	@echo "  make typecheck            Run TypeScript type checking"
	@echo "  make quality              Run lint + typecheck"
	@echo "  make quality-fix          Run lint-fix + typecheck"
	@echo ""
	@echo "Testing - Unit:"
	@echo "  make test                 Run unit tests (alias for test-unit)"
	@echo "  make test-unit            Run unit tests"
	@echo "  make test-unit-ui         Run unit tests with Vitest UI"
	@echo "  make test-unit-cov        Run unit tests with coverage"
	@echo ""
	@echo "Testing - Integration:"
	@echo "  make test-integration     Run integration tests"
	@echo "  make test-integration-watch  Run integration tests in watch mode"
	@echo "  make test-integration-ui  Run integration tests with Vitest UI"
	@echo "  make test-integration-cov Run integration tests with coverage"
	@echo ""
	@echo "Testing - E2E:"
	@echo "  make test-e2e             Run E2E tests (headless)"
	@echo "  make test-e2e-ui          Run E2E tests with Playwright UI"
	@echo "  make test-e2e-headed      Run E2E tests in headed mode"
	@echo "  make test-e2e-report      Show last Playwright HTML report"
	@echo "  make test-e2e-debug       Run E2E tests in debug mode"
	@echo "  make test-e2e-seed        Seed test users for E2E tests"
	@echo ""
	@echo "Database:"
	@echo "  make db-push              Push schema changes to the database"
	@echo "  make db-generate          Generate SQL migration files"
	@echo "  make db-studio            Open Drizzle Studio"
	@echo ""
	@echo "Data and Scripts:"
	@echo "  make fetch                Run the data fetch script"
	@echo "  make geoip-update         Update the GeoIP database"
	@echo ""
	@echo "Dependencies and Audits:"
	@echo "  make audit                Run security audit (moderate+)"
	@echo "  make audit-fix            Auto-fix audit vulnerabilities"
	@echo "  make deps-check           Check for outdated dependencies"
	@echo "  make deps-update          Interactive dependency update"
	@echo ""
	@echo "Bundle and Performance:"
	@echo "  make bundle-analyze       Analyze Next.js bundle sizes"
	@echo "  make bundle-size          Check bundle against size limits"
	@echo "  make lighthouse           Run Lighthouse audit on localhost:3000"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean                Remove all cache, build artifacts and deps"
	@echo "  make clean-build          Remove build artifacts only"
	@echo "  make clean-deps           Remove node_modules only"
	@echo "  make clean-all            Remove everything (build + deps + cache)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build         Build the Docker image"
	@echo "  make docker-up            Start services with docker compose"
	@echo "  make docker-down          Stop and remove containers"
	@echo "  make docker-logs          Tail logs from all containers"
	@echo "  make docker-shell         Open a shell inside the web container"
	@echo "  make docker-clean         Remove containers, volumes, and images"

# Starts the Next.js development server (Turbo), integrated with Inngest.
dev:
	pnpm run dev:web

# Starts the Next.js development server using Webpack instead of Turbo.
dev-webpack:
	pnpm run dev:webpack

# Starts the React Email preview server for developing email templates.
dev-email:
	pnpm run email

# Creates an optimized production build using Turbopack.
build:
	pnpm run build

# Creates an optimized production build using Webpack.
build-webpack:
	pnpm run build:webpack

# Runs quality checks (lint + typecheck) then builds the application.
build-validate:
	pnpm run build:validate

# Creates a production build after running full quality validation.
build-production:
	pnpm run build:production

# Builds the application and opens the bundle analyzer report.
build-analyze:
	pnpm run build:analyze

# Starts the Next.js production server using the compiled build artifacts.
start:
	pnpm run start

# Executes ESLint in strict mode (zero warnings allowed).
lint:
	pnpm run lint:strict

# Automatically fixes fixable ESLint errors and warnings across the codebase.
lint-fix:
	pnpm run lint:fix

# Runs the TypeScript compiler to check for static type errors without emitting files.
typecheck:
	pnpm run typecheck

# Runs a combined suite of quality checks: lint (strict) + typecheck.
quality:
	pnpm run quality

# Runs lint-fix followed by typecheck.
quality-fix:
	pnpm run quality:fix

# Runs the unit test suite (alias for test-unit).
test:
	pnpm run test:unit:run

# Runs only the unit tests in a single pass.
test-unit:
	pnpm run test:unit:run

# Opens the Vitest UI for interactive unit test development.
test-unit-ui:
	pnpm run test:unit:ui

# Runs unit tests and generates a coverage report.
test-unit-cov:
	pnpm run test:unit:coverage

# Runs integration tests in a single pass.
test-integration:
	pnpm run test:integration

# Runs integration tests in watch mode, re-running on file changes.
test-integration-watch:
	pnpm run test:integration:watch

# Opens the Vitest UI for interactive integration test development.
test-integration-ui:
	pnpm run test:integration:ui

# Runs integration tests and generates a coverage report.
test-integration-cov:
	pnpm run test:integration:coverage

# Runs end-to-end tests headlessly.
test-e2e:
	pnpm run test:e2e

# Opens the Playwright interactive UI mode for E2E test development.
test-e2e-ui:
	pnpm run test:e2e:ui

# Runs E2E tests in a headed browser (visible window).
test-e2e-headed:
	pnpm run test:e2e:headed

# Opens the last Playwright HTML report in the browser.
test-e2e-report:
	pnpm run test:e2e:report

# Runs E2E tests in Playwright's step-through debug mode.
test-e2e-debug:
	pnpm run test:e2e:debug

# Seeds the database with E2E test users.
test-e2e-seed:
	pnpm run test:e2e:seed

# Pushes the current Drizzle schema to the database without generating a migration file.
db-push:
	pnpm run db:push

# Generates a new SQL migration file based on schema changes.
db-generate:
	pnpm run db:generate

# Opens Drizzle Studio, a visual database browser.
db-studio:
	pnpm run db:studio

# Runs the data fetch script.
fetch:
	pnpm run fetch

# Updates the local GeoIP database using the MaxMind license key.
geoip-update:
	pnpm run geoip:update

# Runs a security audit and reports vulnerabilities at moderate severity or above.
audit:
	pnpm run audit

# Attempts to automatically resolve audit vulnerabilities.
audit-fix:
	pnpm run audit:fix

# Lists all outdated dependencies.
deps-check:
	pnpm run deps:check

# Opens an interactive prompt to select and update dependencies.
deps-update:
	pnpm run deps:update

# Builds and opens the Next.js bundle analyzer report.
bundle-analyze:
	pnpm run bundle:analyze

# Checks built bundle sizes against the defined size-limit thresholds.
bundle-size:
	pnpm run bundle:size

# Runs a Lighthouse audit against the locally running server on port 3000.
lighthouse:
	pnpm run lighthouse

# Removes all temporary build artifacts, cache files, and node_modules.
clean:
	pnpm run clean:all
	@echo "Cleanup complete."

# Removes only build-related artifacts (.next, dist, etc.).
clean-build:
	pnpm run clean:build

# Removes only node_modules.
clean-deps:
	pnpm run clean:deps

# Removes everything: build artifacts, node_modules, and caches.
clean-all:
	pnpm run clean:all

# Builds the Docker image for the web application, tagged as 'latest'.
docker-build:
	docker build -t mortiscope-web:latest .

# Starts the web application services in detached mode using Docker Compose.
docker-up:
	docker compose up --build -d

# Stops and removes the active containers managed by Docker Compose.
docker-down:
	docker compose down

# Follows the real-time log output from all running containers.
docker-logs:
	docker compose logs -f

# Opens an interactive shell session inside the running web container.
docker-shell:
	docker compose exec web /bin/sh

# Performs a deep clean of the Docker environment, removing containers, volumes, and images.
docker-clean:
	docker compose down -v --rmi all