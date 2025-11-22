# Establishes the foundational Node.js environment based on Alpine Linux.
FROM node:20-alpine@sha256:09e2b3d9726018aecf269bd35325f46bf75046a643a66d28360ec71132750ec8 AS base

# Prepare the package manager.
ARG PNPM_VERSION=10.14.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Installs dependencies.
FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Disable Husky git hooks during the build process.
ENV HUSKY=0

# Install dependencies using a cache mount to speed up repeated builds.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Compiles the Next.js application into production-ready static files.
FROM base AS builder

WORKDIR /app

# Specific `node_modules` from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy the application source code.
COPY . .

# Import build-time environment variables.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_FASTAPI_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_FASTAPI_URL=$NEXT_PUBLIC_FASTAPI_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# Disable Next.js telemetry and skip runtime environment validation during the build to prevent errors.
ENV NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1 \
    NODE_OPTIONS="--max-old-space-size=4096"

# Execute the production build script.
RUN pnpm run build

# Creates a minimal, secure runtime image.
FROM node:20-alpine@sha256:09e2b3d9726018aecf269bd35325f46bf75046a643a66d28360ec71132750ec8 AS runner

# Update system packages to patch potential security vulnerabilities in the base image.
RUN apk upgrade --no-cache

LABEL maintainer="MortiScope Research Partners <mortiscope@gmail.com>" \
      version="1.0.0" \
      description="A web application for a deep learning system that analyzes Chrysomya megacephala images to assist in forensic Post-Mortem Interval (PMI) estimation."

WORKDIR /app

# Configure the environment for production performance.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create a non-root system group and user to run the application securely.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy essential build artifacts from the builder stage.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Switch to the non-root user.
USER nextjs

# Document that the container listens on port 3000.
EXPOSE 3000

# Configure a health check using wget (standard in Alpine) to ensure the server is responsive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["sh", "-c", "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1"]

# Start the Next.js production server.
CMD ["node_modules/.bin/next", "start"]