#!/usr/bin/env tsx

/**
 * Case data fetching utility
 *
 * Fetches comprehensive case data by case name and outputs it either:
 * - To the terminal with formatted, colored output
 * - As a JSON file for further processing
 *
 * Features:
 * - Interactive mode with searchable case selection
 * - Direct case name specification via command-line argument
 * - JSON export with optional custom filename
 *
 * Usage:
 *   pnpm fetch                                    # Interactive mode
 *   pnpm fetch [caseName]                         # Direct fetch
 *   pnpm fetch [caseName] --json                  # Export as JSON
 *   pnpm fetch [caseName] --output <filename>     # Custom JSON filename
 */

import "dotenv/config";

import chalk from "chalk";
import { desc, eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import path from "path";
import prompts from "prompts";
import { fileURLToPath } from "url";

import { db } from "@/db";
import * as schema from "@/db/schema";

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
 * Prompts user for confirmation
 *
 * @param message - Confirmation message to display
 * @param defaultAnswer - Default response if user just presses Enter
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
async function askForConfirmation(
  message: string,
  defaultAnswer: boolean = false
): Promise<boolean> {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message,
    initial: defaultAnswer,
  });

  // Handle Ctrl+C or ESC
  if (response.value === undefined) {
    return defaultAnswer;
  }

  return response.value;
}

/**
 * Fetches all case names from the database
 *
 * @returns Promise that resolves to array of case information
 */
async function fetchAllCases() {
  try {
    const allCases = await db.query.cases.findMany({
      columns: {
        caseName: true,
        caseDate: true,
        status: true,
        createdAt: true,
      },
      orderBy: [desc(schema.cases.createdAt)],
    });

    return allCases;
  } catch (error) {
    logError(`Failed to fetch cases: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Prompts user to select a case from the list
 *
 * @returns Promise that resolves to selected case name or null if cancelled
 */
async function promptForCaseSelection(): Promise<string | null> {
  logInfo("Fetching available cases...");

  const allCases = await fetchAllCases();

  if (allCases.length === 0) {
    logError("No cases found in the database");
    return null;
  }

  logSuccess(`Found ${allCases.length} case(s)`);
  console.log();

  const choices = allCases.map((c) => ({
    title: `${c.caseName} ${chalk.dim(`(${c.status} - ${c.caseDate.toLocaleDateString()})`)}`,
    value: c.caseName,
  }));

  const response = await prompts({
    type: "autocomplete",
    name: "caseName",
    message: "Select a case",
    choices,
    initial: 0,
  });

  // Handle Ctrl+C or ESC
  if (response.caseName === undefined) {
    return null;
  }

  return response.caseName;
}

/**
 * Fetches case data by case name with all related information
 *
 * @param caseName - Name of the case to fetch
 * @returns Promise that resolves to case data or null if not found
 */
async function fetchCaseData(caseName: string) {
  try {
    logInfo(`Searching for case: ${chalk.cyan(caseName)}...`);

    // Find the case by name with only the tables that exist
    const caseRecord = await db.query.cases.findFirst({
      where: eq(schema.cases.caseName, caseName),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            professionalTitle: true,
            institution: true,
          },
        },
        uploads: true,
        analysisResult: true,
      },
    });

    if (!caseRecord) {
      return null;
    }

    // Fetch exports
    const exports = await db.query.exports.findMany({
      where: eq(schema.exports.caseId, caseRecord.id),
    });

    // Fetch audit logs with user info
    const auditLogs = await db.query.caseAuditLogs.findMany({
      where: eq(schema.caseAuditLogs.caseId, caseRecord.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Fetch detections (bounding boxes) for each upload
    const uploadsWithDetections = await Promise.all(
      caseRecord.uploads.map(async (upload) => {
        const detections = await db.query.detections.findMany({
          where: eq(schema.detections.uploadId, upload.id),
        });
        return {
          ...upload,
          detections,
        };
      })
    );

    return {
      ...caseRecord,
      uploads: uploadsWithDetections,
      exports,
      auditLogs,
    };
  } catch (error) {
    logError(
      `Failed to fetch case data: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Displays case data in a formatted terminal output
 *
 * @param caseData - Case data to display
 */
function displayCaseInTerminal(caseData: NonNullable<Awaited<ReturnType<typeof fetchCaseData>>>) {
  console.log();
  console.log(chalk.bold.cyan(`CASE: ${caseData.caseName}`));
  console.log();

  // Basic Information
  console.log(chalk.bold.yellow("Basic Information"));
  console.log(`  ${chalk.dim("ID:")}              ${caseData.id}`);
  console.log(`  ${chalk.dim("Status:")}          ${caseData.status}`);
  console.log(`  ${chalk.dim("Case Date:")}       ${caseData.caseDate.toISOString()}`);
  console.log(`  ${chalk.dim("Created At:")}      ${caseData.createdAt.toISOString()}`);
  console.log(
    `  ${chalk.dim("Recalc Needed:")}   ${caseData.recalculationNeeded ? chalk.yellow("Yes") : chalk.green("No")}`
  );
  if (caseData.notes) {
    console.log(`  ${chalk.dim("Notes:")}           ${caseData.notes}`);
  }
  console.log();

  // Location Information
  console.log(chalk.bold.yellow("Location"));
  console.log(`  ${chalk.dim("Region:")}          ${caseData.locationRegion}`);
  console.log(`  ${chalk.dim("Province:")}        ${caseData.locationProvince}`);
  console.log(`  ${chalk.dim("City:")}            ${caseData.locationCity}`);
  console.log(`  ${chalk.dim("Barangay:")}        ${caseData.locationBarangay}`);
  console.log(`  ${chalk.dim("Temperature:")}     ${caseData.temperatureCelsius}°C`);
  console.log();

  // User Information
  console.log(chalk.bold.yellow("Case Owner"));
  console.log(`  ${chalk.dim("Name:")}            ${caseData.user.name || "N/A"}`);
  console.log(`  ${chalk.dim("Email:")}           ${caseData.user.email}`);
  if (caseData.user.professionalTitle) {
    console.log(`  ${chalk.dim("Title:")}           ${caseData.user.professionalTitle}`);
  }
  if (caseData.user.institution) {
    console.log(`  ${chalk.dim("Institution:")}     ${caseData.user.institution}`);
  }
  console.log();

  // Analysis Results
  if (caseData.analysisResult) {
    const result = caseData.analysisResult;
    console.log(chalk.bold.yellow("Analysis Results"));
    console.log(`  ${chalk.dim("Status:")}          ${result.status}`);

    if (result.status === "completed") {
      console.log(`  ${chalk.dim("Oldest Stage:")}    ${result.oldestStageDetected || "N/A"}`);
      console.log(`  ${chalk.dim("Stage Used:")}      ${result.stageUsedForCalculation || "N/A"}`);

      if (result.pmiDays !== null || result.pmiHours !== null || result.pmiMinutes !== null) {
        console.log(
          `  ${chalk.dim("PMI:")}             ${result.pmiDays || 0}d ${result.pmiHours || 0}h ${result.pmiMinutes || 0}m`
        );
      }

      if (result.calculatedAdh !== null) {
        console.log(`  ${chalk.dim("Calculated ADH:")}  ${result.calculatedAdh}`);
      }

      if (result.ldtUsed !== null) {
        console.log(`  ${chalk.dim("LDT Used:")}        ${result.ldtUsed}`);
      }

      if (result.totalCounts) {
        console.log(`  ${chalk.dim("Total Counts:")}    ${JSON.stringify(result.totalCounts)}`);
      }

      if (result.explanation) {
        console.log(`  ${chalk.dim("Explanation:")}     ${result.explanation}`);
      }
    }

    if (result.updatedAt) {
      console.log(`  ${chalk.dim("Updated At:")}      ${result.updatedAt.toISOString()}`);
    }
    console.log();
  }

  // Uploads
  console.log(chalk.bold.yellow(`Uploads (${caseData.uploads.length})`));
  if (caseData.uploads.length === 0) {
    console.log(chalk.dim("  No uploads found"));
  } else {
    caseData.uploads.forEach((upload, index) => {
      console.log(`  ${chalk.cyan(`[${index + 1}]`)} ${upload.name}`);
      console.log(`      ${chalk.dim("ID:")}            ${upload.id}`);
      console.log(`      ${chalk.dim("Type:")}          ${upload.type}`);
      console.log(`      ${chalk.dim("Size:")}          ${(upload.size / 1024).toFixed(2)} KB`);
      console.log(`      ${chalk.dim("Detections:")}    ${upload.detections.length}`);

      if (upload.detections.length > 0) {
        upload.detections.forEach((det, detIndex) => {
          console.log(`        ${chalk.dim(`[${detIndex + 1}]`)} ${det.label}`);
          console.log(
            `            ${chalk.dim("Confidence:")} ${det.confidence !== null ? (det.confidence * 100).toFixed(2) + "%" : "N/A"}`
          );
          console.log(
            `            ${chalk.dim("Bounding Box:")} (${det.xMin.toFixed(1)}, ${det.yMin.toFixed(1)}) to (${det.xMax.toFixed(1)}, ${det.yMax.toFixed(1)})`
          );
        });
      }
    });
  }
  console.log();

  // Exports
  console.log(chalk.bold.yellow(`Exports (${caseData.exports.length})`));
  if (caseData.exports.length === 0) {
    console.log(chalk.dim("  No exports found"));
  } else {
    caseData.exports.forEach((exp, index) => {
      console.log(`  ${chalk.cyan(`[${index + 1}]`)} ${exp.format} - ${exp.status}`);
      console.log(`      ${chalk.dim("ID:")}            ${exp.id}`);
      console.log(`      ${chalk.dim("Created:")}       ${exp.createdAt.toISOString()}`);
      console.log(`      ${chalk.dim("Protected:")}     ${exp.passwordProtected ? "Yes" : "No"}`);
      if (exp.s3Key) {
        console.log(`      ${chalk.dim("S3 Key:")}        ${exp.s3Key}`);
      }
      if (exp.failureReason) {
        console.log(`      ${chalk.dim("Failure:")}       ${chalk.red(exp.failureReason)}`);
      }
    });
  }
  console.log();

  // Audit Logs
  console.log(chalk.bold.yellow(`Audit Logs (${caseData.auditLogs.length})`));
  if (caseData.auditLogs.length === 0) {
    console.log(chalk.dim("  No audit logs found"));
  } else {
    // Show only the last 10 audit logs
    const logsToShow = caseData.auditLogs.slice(-10);
    if (caseData.auditLogs.length > 10) {
      console.log(chalk.dim(`  Showing last 10 of ${caseData.auditLogs.length} logs`));
    }

    logsToShow.forEach((log, index) => {
      console.log(
        `  ${chalk.cyan(`[${index + 1}]`)} ${log.field} - ${log.timestamp.toISOString()}`
      );
      console.log(`      ${chalk.dim("User:")}         ${log.user.name || log.user.email}`);
      console.log(`      ${chalk.dim("Batch ID:")}     ${log.batchId}`);
      if (log.oldValue !== null) {
        console.log(`      ${chalk.dim("Old Value:")}    ${JSON.stringify(log.oldValue)}`);
      }
      if (log.newValue !== null) {
        console.log(`      ${chalk.dim("New Value:")}    ${JSON.stringify(log.newValue)}`);
      }
    });
  }
  console.log();
}

/**
 * Saves case data to a JSON file
 *
 * @param caseData - Case data to save
 * @param filename - Output filename (optional)
 */
async function saveCaseToJson(
  caseData: NonNullable<Awaited<ReturnType<typeof fetchCaseData>>>,
  filename?: string
): Promise<void> {
  const defaultFilename = `case-${caseData.caseName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}.json`;
  const outputFilename = filename || defaultFilename;

  try {
    const jsonData = JSON.stringify(caseData, null, 2);
    await writeFile(outputFilename, jsonData, "utf-8");
    logSuccess(`Case data saved to ${chalk.cyan(outputFilename)}`);
  } catch (error) {
    logError(`Failed to save JSON file: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Displays usage information
 */
function showUsage(): void {
  console.log(chalk.bold("\nFetch Case Data"));
  console.log("\nUsage:");
  console.log(
    "  pnpm fetch                              - Interactive mode with searchable case list"
  );
  console.log(
    "  pnpm fetch [caseName]                   - Fetch specific case and display in terminal"
  );
  console.log("  pnpm fetch [caseName] --json            - Fetch case and save as JSON");
  console.log("  pnpm fetch [caseName] -o <filename>     - Save with custom filename");
  console.log("\nAlternative (direct script execution):");
  console.log("  tsx scripts/fetch.ts [options]");
  console.log("\nOptions:");
  console.log("  --json, -j                              - Output as JSON file");
  console.log(
    "  --output <filename>, -o <filename>      - Specify output filename (implies --json)"
  );
  console.log("  --help, -h                              - Show this help message");
  console.log("\nInteractive Mode:");
  console.log("  When no case name is provided, you'll get:");
  console.log("  1. A searchable list of all available cases");
  console.log("  2. Case details shown with status and date");
  console.log("  3. Option to save output as JSON or display in terminal");
  console.log("\nExamples:");
  console.log(
    chalk.dim("  pnpm fetch                                 # Interactive: select from list")
  );
  console.log(
    chalk.dim('  pnpm fetch "Case 001"                      # Direct: display in terminal')
  );
  console.log(chalk.dim('  pnpm fetch "Case 001" --json               # Direct: save as JSON'));
  console.log(chalk.dim('  pnpm fetch "Case 001" -o my-case.json      # Direct: custom filename'));
  console.log(
    chalk.dim('  tsx scripts/fetch.ts "Case 001"            # Alternative execution method')
  );
}

/**
 * Main script execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    showUsage();
    return;
  }

  // Parse arguments
  let caseName = args.find((arg) => !arg.startsWith("-"));
  const jsonOutput = args.includes("--json") || args.includes("-j");
  const outputIndex = args.findIndex((arg) => arg === "--output" || arg === "-o");
  const outputFilename = outputIndex !== -1 ? args[outputIndex + 1] : undefined;

  try {
    // Interactive mode if no case name provided
    if (!caseName) {
      console.log(chalk.bold("\nFetch Case Data\n"));
      const selectedCase = await promptForCaseSelection();

      if (!selectedCase) {
        logError("No case selected");
        process.exit(1);
      }

      caseName = selectedCase;
    }

    // Fetch case data
    const caseData = await fetchCaseData(caseName);

    if (!caseData) {
      logError(`Case not found: ${chalk.cyan(caseName)}`);
      logInfo("Please check the case name and try again");
      process.exit(1);
    }

    logSuccess(`Found case: ${chalk.cyan(caseData.caseName)}`);

    // Determine output format
    let shouldOutputJson = jsonOutput || outputFilename !== undefined;

    if (!shouldOutputJson && !args.find((arg) => !arg.startsWith("-"))) {
      // Interactive mode - ask for output format
      console.log();
      shouldOutputJson = await askForConfirmation("Save as JSON file?", false);
    }

    if (shouldOutputJson) {
      await saveCaseToJson(caseData, outputFilename);
    } else {
      displayCaseInTerminal(caseData);
    }
  } catch (error) {
    logError("An error occurred while fetching case data");
    console.error(error);
    process.exit(1);
  }
}

// Script Execution
const isDirectlyExecuted = fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectlyExecuted) {
  main();
}
