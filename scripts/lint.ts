#!/usr/bin/env tsx

/**
 * Custom ESLint wrapper that mimics Next.js lint output
 * Provides colored output and user-friendly messages
 */

import chalk from "chalk";
import { spawn } from "child_process";
import path from "path";

interface LintResult {
  errorCount: number;
  warningCount: number;
  fileCount: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const isFixMode = args.includes("--fix");

// Determine if strict mode is enabled for logging purposes
const maxWarningsIndex = args.indexOf("--max-warnings");
const isStrictMode = maxWarningsIndex !== -1 && args[maxWarningsIndex + 1] === "0";

// Pass all arguments directly to ESLint.
const eslintArgs = [...args];

// Add default target if none specified
if (!eslintArgs.some((arg) => !arg.startsWith("--"))) {
  eslintArgs.push(".");
}

function logInfo(message: string): void {
  console.log(`${chalk.blue("info")} - ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

function logError(message: string): void {
  console.log(`${chalk.red("✗")} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${chalk.yellow("⚠")} ${message}`);
}

function formatFileCount(count: number, type: string): string {
  return count === 1 ? `1 ${type}` : `${count} ${type}s`;
}

function parseLintOutput(output: string): LintResult {
  const lines = output.split("\n");
  const summaryLine = lines.find(
    (line) => line.includes("problem") || line.includes("error") || line.includes("warning")
  );

  let errorCount = 0;
  let warningCount = 0;

  if (summaryLine) {
    const errorMatch = summaryLine.match(/(\d+)\s+error/);
    const warningMatch = summaryLine.match(/(\d+)\s+warning/);

    errorCount = errorMatch ? parseInt(errorMatch[1]) : 0;
    warningCount = warningMatch ? parseInt(warningMatch[1]) : 0;
  }

  // Count files with issues
  const fileLines = lines.filter((line) => line.match(/^\/.*\.(js|jsx|ts|tsx)$/));
  const fileCount = fileLines.length;

  return { errorCount, warningCount, fileCount };
}

function handleLintResults(code: number, stdout: string, stderr: string): void {
  const { errorCount, warningCount } = parseLintOutput(stdout);

  if (code === 0) {
    // No errors or warnings
    if (isFixMode) {
      logSuccess("No linting errors found.");
      if (stdout.includes("fixed")) {
        logInfo("Some issues were automatically fixed.");
      }
    } else {
      logSuccess("No linting errors found.");
    }
  } else if (code === 1) {
    // ESLint found issues
    if (stdout) {
      // Print the actual ESLint output
      console.log(stdout);
    }

    if (errorCount > 0 && warningCount > 0) {
      logError(
        `Found ${formatFileCount(errorCount, "error")} and ${formatFileCount(warningCount, "warning")}`
      );
    } else if (errorCount > 0) {
      logError(`Found ${formatFileCount(errorCount, "error")}`);
    } else if (warningCount > 0) {
      if (isStrictMode) {
        logError(
          `Found ${formatFileCount(warningCount, "warning")} (treated as errors due to --max-warnings=0)`
        );
      } else {
        logWarning(`Found ${formatFileCount(warningCount, "warning")}`);
      }
    }

    if (!isFixMode && errorCount === 0 && warningCount > 0) {
      logInfo("Run with --fix to automatically fix some issues.");
    }
  } else {
    // ESLint had an error (config issues, etc.)
    if (stderr) {
      console.error(stderr);
    }
    if (stdout) {
      console.log(stdout);
    }
    logError("ESLint encountered an error.");
  }
}

// Start linting
logInfo(`Linting ${chalk.cyan(path.basename(process.cwd()))}...`);

const eslint = spawn("npx", ["eslint", ...eslintArgs], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
});

let stdout = "";
let stderr = "";

eslint.stdout?.on("data", (data: Buffer) => {
  stdout += data.toString();
});

eslint.stderr?.on("data", (data: Buffer) => {
  stderr += data.toString();
});

eslint.on("close", (code: number | null) => {
  const exitCode = code ?? 1;
  handleLintResults(exitCode, stdout, stderr);
  process.exit(exitCode);
});

eslint.on("error", (error: Error) => {
  logError(`Failed to start ESLint: ${error.message}`);

  if ("code" in error && error.code === "ENOENT") {
    logInfo("Make sure ESLint is installed:");
    console.log(chalk.dim("  npm install --save-dev eslint"));
    console.log(chalk.dim("  # or"));
    console.log(chalk.dim("  pnpm add -D eslint"));
  }

  process.exit(1);
});
