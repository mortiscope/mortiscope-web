import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite plugins to use during testing.
  plugins: [react(), tsconfigPaths()],
  test: {
    /**
     * Specifies the glob patterns for files that Vitest should treat as test files.
     */
    projects: [
      // Unit Tests Project
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/e2e/**",
            "**/*.integration.test.{js,ts,jsx,tsx}",
          ],
          setupFiles: ["src/__tests__/setup/setup.ts"],
          testTimeout: 15000,
          pool: "forks",
          fileParallelism: true,
          clearMocks: true,
          restoreMocks: true,
          mockReset: true,
        },
      },
      // Integration Tests Project
      {
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          globals: true,
          include: ["**/*.integration.test.{js,ts,jsx,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/__tests__/integration/api/**",
          ],
          setupFiles: ["src/__tests__/setup/setup.ts"],
          testTimeout: 30000,
          pool: "forks",
          fileParallelism: true,
          clearMocks: true,
          restoreMocks: true,
          mockReset: true,
        },
      },
    ],
    // Coverage Configuration
    coverage: {
      /**
       * Specifies the coverage provider.
       */
      provider: "v8",
      /**
       * Disables coverage collection by default.
       */
      enabled: false,
      /**
       * Specifies the formats for the generated coverage report.
       */
      reporter: ["text", "json", "html", "lcov"],
      /**
       * Defines the directory where the coverage reports will be generated.
       */
      reportsDirectory: "coverage",
      /**
       * Specifies which files should be included in the coverage report.
       */
      include: ["src/**/*.{ts,tsx}"],
      /**
       * Specifies files and patterns to exclude from the coverage report.
       */
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/types/**",
        "**/*.d.ts",
        "src/auth.ts",
        "src/instrumentation-client.ts",
        "src/instrumentation.ts",
        "src/middleware.ts",
        "src/routes.ts",
        "src/components/**",
        "src/data/**",
        "src/db/**",
        "src/hooks/**",
        "src/inngest/**",
        "src/emails/**",
        "src/features/home/**",
        "src/features/legal/**",
        "src/lib/**",
        "src/**/constants.ts",
        "src/**/styles.ts",
        "src/**/types.ts",
        ...(process.argv.includes("integration") || process.env.TEST_TYPE === "integration"
          ? [
              "**/features/**/components/**",
              "**/features/**/hooks/**",
              "**/features/**/schemas/**",
              "src/**/page.tsx",
              "src/**/layout.tsx",
              "src/app/global-error.tsx",
              "src/**/not-found.tsx",
              "**/store/**",
              "src/stores/**",
              "src/app/api/**",
              "src/features/account/utils/display-session.ts",
              "src/features/account/utils/format-date.ts",
              "src/features/account/utils/format-session.ts",
              "src/features/account/utils/parse-session.ts",
              "src/features/annotation/utils/calculate-detection-changes.ts",
              "src/features/annotation/utils/event-coordinates.ts",
              "src/features/annotation/utils/lightened-color.ts",
              "src/features/dashboard/utils/date-url-sync.ts",
              "src/features/dashboard/utils/format-date-range.ts",
              "src/features/dashboard/utils/highlight-text.ts",
              "src/features/export/constants/pdf-options.ts",
            ]
          : []),
        ...(process.argv.includes("unit") || process.env.TEST_TYPE === "unit"
          ? ["src/app/**"]
          : []),
        ...(process.argv.includes("integration") ||
        process.env.TEST_TYPE === "integration" ||
        process.argv.includes("unit") ||
        process.env.TEST_TYPE === "unit"
          ? []
          : ["src/app/**"]),
      ],
      /**
       * Sets the minimum coverage thresholds required for the test suite to pass.
       */
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
