#!/usr/bin/env tsx

/**
 * TypeScript type-checking wrapper with enhanced output formatting
 *
 * This script wraps `tsc --noEmit` to provide:
 * - Real-time error streaming
 * - Proper error handling and exit codes
 * - Support for additional tsc arguments (like --watch)
 */

import chalk from "chalk";
import { spawn } from "child_process";
import path from "path";

// Extract additional arguments passed to this script (e.g., --watch, --project)
const additionalTscArgs = process.argv.slice(2);

/**
 * Logs an informational message with blue styling
 */
function logInfo(message: string): void {
  console.log(`${chalk.blue("info")} - ${message}`);
}

/**
 * Logs a success message with green checkmark
 */
function logSuccess(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

/**
 * Logs an error message with red X mark
 */
function logError(message: string): void {
  console.log(`${chalk.red("✗")} ${message}`);
}

/**
 * Processes TypeScript compiler output and displays appropriate messages
 *
 * @param exitCode - Process exit code (0 = success, non-zero = failure)
 * @param stdoutBuffer - Standard output from tsc process
 * @param stderrBuffer - Standard error from tsc process
 */
function processTypecheckResults(
  exitCode: number | null,
  stdoutBuffer: string,
  stderrBuffer: string
): void {
  const trimmedStdout = stdoutBuffer.trim();
  const trimmedStderr = stderrBuffer.trim();

  if (exitCode === 0) {
    logSuccess("All files passed type-checking.");
    return;
  }

  // Display TypeScript errors (typically sent to stdout)
  if (trimmedStdout) {
    console.log(trimmedStdout);
  }

  logError("\nType-checking failed with errors.");

  // Display any additional error information from stderr
  if (trimmedStderr) {
    console.error(chalk.dim(trimmedStderr));
  }
}

/**
 * Handles errors that occur when spawning the tsc process
 */
function handleSpawnError(error: Error): void {
  logError(`Failed to start TypeScript compiler: ${error.message}`);

  // Provide helpful guidance for common errors
  if ("code" in error && error.code === "ENOENT") {
    console.log();
    logInfo("Ensure TypeScript is installed in the project:");
    console.log(chalk.dim("  npm install --save-dev typescript"));
    console.log(chalk.dim("  # or"));
    console.log(chalk.dim("  pnpm add -D typescript"));
  }

  process.exit(1);
}

// Script Execution
const projectName = path.basename(process.cwd());
logInfo(`Type-checking ${chalk.cyan(projectName)}...`);

// Spawn TypeScript compiler with noEmit flag to only check types
const tscProcess = spawn("npx", ["tsc", "--noEmit", "--pretty", ...additionalTscArgs], {
  stdio: "pipe", // Capture output for custom processing
  shell: true, // Enable shell for cross-platform npx compatibility
});

// Buffers to accumulate process output
let stdoutAccumulator = "";
let stderrAccumulator = "";

// Collect stdout data as it becomes available
tscProcess.stdout?.on("data", (chunk: Buffer) => {
  stdoutAccumulator += chunk.toString();
});

// Collect stderr data as it becomes available
tscProcess.stderr?.on("data", (chunk: Buffer) => {
  stderrAccumulator += chunk.toString();
});

// Handle process completion
tscProcess.on("close", (exitCode: number | null) => {
  processTypecheckResults(exitCode, stdoutAccumulator, stderrAccumulator);
  process.exit(exitCode ?? 1);
});

// Handle process spawn errors
tscProcess.on("error", handleSpawnError);
