#!/usr/bin/env tsx

/**
 * Project cleanup utility scripts
 *
 * Provides clean commands for removing build artifacts and dependencies:
 * - Interactive mode: Choose what to clean with a menu
 * - build: Removes build outputs (.next, out, dist directories)
 * - deps: Removes node_modules and reinstalls dependencies
 * - all: Runs both operations
 */

import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

/**
 * Directories to clean when running build cleanup
 */
const BUILD_DIRECTORIES = [".next", "out", "dist"] as const;

/**
 * Package managers to detect and use for dependency installation
 */
const PACKAGE_MANAGERS = [
  { name: "pnpm", lockFile: "pnpm-lock.yaml", command: "pnpm" },
  { name: "yarn", lockFile: "yarn.lock", command: "yarn" },
  { name: "npm", lockFile: "package-lock.json", command: "npm" },
] as const;

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
 * Logs a warning message with yellow styling
 */
function logWarning(message: string): void {
  console.log(`${chalk.yellow("⚠")} ${message}`);
}

/**
 * Prompts user for confirmation before proceeding with operation
 *
 * @param message - Confirmation message to display
 * @param defaultAnswer - Default response if user just presses Enter
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
function askForConfirmation(message: string, defaultAnswer: boolean = false): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const defaultText = defaultAnswer ? "Y/n" : "y/N";
    const prompt = `${chalk.yellow("?")} ${message} (${defaultText}): `;

    rl.question(prompt, (answer) => {
      rl.close();

      const normalized = answer.trim().toLowerCase();

      if (normalized === "") {
        resolve(defaultAnswer);
      } else {
        resolve(normalized === "y" || normalized === "yes");
      }
    });
  });
}

/**
 * Displays an interactive menu for selecting cleanup operations
 *
 * @returns Promise that resolves to selected cleanup operations
 */
function showInteractiveMenu(): Promise<{
  buildArtifacts: boolean;
  dependencies: boolean;
  cancelled: boolean;
}> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.bold("\nClean Utility - Interactive Mode"));
    console.log("\nWhat would you like to clean?");
    console.log(`${chalk.cyan("1)")} Build artifacts ${chalk.dim("(.next, out, dist)")}`);
    console.log(`${chalk.cyan("2)")} Dependencies ${chalk.dim("(node_modules + reinstall)")}`);
    console.log(`${chalk.cyan("3)")} Both build artifacts and dependencies`);
    console.log(`${chalk.cyan("4)")} Cancel`);

    const prompt = `\n${chalk.yellow("?")} Select an option (1-4): `;

    rl.question(prompt, (answer) => {
      rl.close();

      const choice = answer.trim();

      switch (choice) {
        case "1":
          resolve({ buildArtifacts: true, dependencies: false, cancelled: false });
          break;
        case "2":
          resolve({ buildArtifacts: false, dependencies: true, cancelled: false });
          break;
        case "3":
          resolve({ buildArtifacts: true, dependencies: true, cancelled: false });
          break;
        case "4":
        case "":
          resolve({ buildArtifacts: false, dependencies: false, cancelled: true });
          break;
        default:
          logError(`Invalid option: ${choice}`);
          resolve({ buildArtifacts: false, dependencies: false, cancelled: true });
      }
    });
  });
}

/**
 * Detects the package manager used in the current project
 * Based on presence of lock files
 */
function detectPackageManager(): (typeof PACKAGE_MANAGERS)[number] | null {
  for (const pm of PACKAGE_MANAGERS) {
    if (existsSync(pm.lockFile)) {
      return pm;
    }
  }
  return null;
}

/**
 * Removes a directory if it exists
 *
 * @param dirPath - Path to directory to remove
 * @returns Promise that resolves when directory is removed or doesn't exist
 */
async function removeDirectoryIfExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    return;
  }

  try {
    await rm(dirPath, { recursive: true, force: true });
    logSuccess(`Removed ${chalk.cyan(dirPath)}`);
  } catch (error) {
    logError(
      `Failed to remove ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Executes a shell command and returns a promise
 *
 * @param command - Command to execute
 * @param args - Command arguments
 * @returns Promise that resolves when command completes
 */
function executeCommand(command: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Cleans build artifacts and output directories
 *
 * @param skipConfirmation - Whether to skip confirmation prompt
 */
async function cleanBuildArtifacts(skipConfirmation: boolean = false): Promise<void> {
  logInfo("Cleaning build artifacts...");

  const existingDirs = BUILD_DIRECTORIES.filter((dir) => existsSync(dir));

  if (existingDirs.length === 0) {
    logInfo("No build artifacts found to clean");
    return;
  }

  if (!skipConfirmation) {
    const dirsText = existingDirs.map((dir) => chalk.cyan(dir)).join(", ");
    const confirmed = await askForConfirmation(`Remove build directories: ${dirsText}?`, true);

    if (!confirmed) {
      logInfo("Build cleanup cancelled");
      return;
    }
  }

  try {
    await Promise.all(existingDirs.map((dir) => removeDirectoryIfExists(dir)));
    logSuccess("Build cleanup completed");
  } catch (error) {
    logError("Build cleanup failed");
    throw error;
  }
}

/**
 * Cleans dependencies by removing node_modules and reinstalling
 *
 * @param skipConfirmation - Whether to skip confirmation prompt
 */
async function cleanDependencies(skipConfirmation: boolean = false): Promise<void> {
  logInfo("Cleaning dependencies...");

  if (!existsSync("node_modules")) {
    logInfo("No node_modules directory found");
    return;
  }

  if (!skipConfirmation) {
    const confirmed = await askForConfirmation(
      "Remove node_modules and reinstall dependencies? This may take a while",
      false
    );

    if (!confirmed) {
      logInfo("Dependencies cleanup cancelled");
      return;
    }
  }

  // Remove node_modules
  await removeDirectoryIfExists("node_modules");

  // Detect package manager and reinstall
  const packageManager = detectPackageManager();

  if (!packageManager) {
    logWarning("No lock file found, defaulting to npm for installation");
    logInfo("Installing dependencies with npm...");
    await executeCommand("npm", ["install"]);
  } else {
    logInfo(`Installing dependencies with ${packageManager.name}...`);
    // 'install' command is the same for pnpm, npm, and yarn v1+.
    await executeCommand(packageManager.command, ["install"]);
  }

  logSuccess("Dependencies cleanup completed");
}

/**
 * Displays usage information
 */
function showUsage(): void {
  console.log(chalk.bold("\nClean Utility"));
  console.log("\nUsage:");
  console.log("  clean             - Interactive mode (choose what to clean)");
  console.log("  clean build       - Remove build artifacts (.next, out, dist)");
  console.log("  clean deps        - Remove node_modules and reinstall dependencies");
  console.log("  clean all         - Run both clean operations");
  console.log("\nOptions:");
  console.log("  --force, -f       - Skip confirmation prompts for all operations");
  console.log("  --interactive, -i - Force interactive mode");
  console.log("\nExamples:");
  console.log(chalk.dim("  tsx scripts/clean.ts              # Interactive menu"));
  console.log(chalk.dim("  tsx scripts/clean.ts build        # Clean build artifacts"));
  console.log(chalk.dim("  tsx scripts/clean.ts deps --force # Clean deps without prompts"));
}

// Script Execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("-")) || undefined;
  const forceMode = args.includes("--force") || args.includes("-f");
  const interactiveMode = args.includes("--interactive") || args.includes("-i");

  try {
    // Force interactive mode if no command specified or --interactive flag used
    if (!command || interactiveMode) {
      const selection = await showInteractiveMenu();

      if (selection.cancelled) {
        logInfo("Operation cancelled");
        return;
      }

      if (selection.buildArtifacts) {
        await cleanBuildArtifacts(forceMode);
        if (selection.dependencies) {
          console.log();
        }
      }

      if (selection.dependencies) {
        await cleanDependencies(forceMode);
      }

      return;
    }

    switch (command) {
      case "build":
        await cleanBuildArtifacts(forceMode);
        break;

      case "deps":
        await cleanDependencies(forceMode);
        break;

      case "all":
        await cleanBuildArtifacts(forceMode);
        console.log();
        await cleanDependencies(forceMode);
        break;

      case "help":
      case "--help":
      case "-h":
        showUsage();
        break;

      default:
        logError(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch {
    // Errors are already logged in the functions, so just exit
    process.exit(1);
  }
}

const isDirectlyExecuted = fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectlyExecuted) {
  main();
}
