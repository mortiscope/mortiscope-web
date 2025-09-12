import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite plugins to use during testing.
  plugins: [react(), tsconfigPaths()],
  test: {
    // Test File Configuration

    /**
     * Specifies the glob patterns for files that Vitest should treat as test files.
     */
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
    /**
     * Specifies glob patterns for files and directories that Vitest should ignore.
     */
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/e2e/**",
      "**/*.integration.test.{js,ts,jsx,tsx}",
    ],

    // Test Environment

    /**
     * Sets the test environment.
     */
    environment: "jsdom",
    /**
     * Enables Vitest's global APIs to be available in all test files without needing explicit imports.
     */
    globals: true,
    /**
     * Sets the default timeout for each test in milliseconds.
     */
    testTimeout: 15000,

    /**
     * Specifies setup files to be run before each test file is executed.
     */
    setupFiles: ["./src/__tests__/setup/setup.ts"],

    // Performance and Concurrency

    /**
     * Sets the test runner pool. 'forks' runs test files in isolated child processes.
     */
    pool: "forks",
    /**
     * Allows Vitest to run multiple test files in parallel.
     */
    fileParallelism: true,

    // Test Coverage Configuration
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
      reportsDirectory: "./coverage",
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
        "src/app/**",
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

    // Mocking and Lifecycle Hooks

    /**
     * If true, automatically clears mock history before each test.
     */
    clearMocks: true,
    /**
     * If true, automatically restores the original implementations of mocked functions before each test.
     */
    restoreMocks: true,
    /**
     * If true, automatically resets mocks to their initial implementation before each test.
     */
    mockReset: true,
  },
});
