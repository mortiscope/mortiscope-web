import { eq } from "drizzle-orm";

import { db } from "@/db";
import { exports } from "@/db/schema";
import { type PdfPermissions } from "@/features/export/constants/pdf-options";
import { env } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { exportLogger, inngestLogger, logError } from "@/lib/logger";

/**
 * Type definition for the export payload
 */
type ExportPayload = {
  export_id: string;
  case_id: string;
  format: string;
  // PDF-specific fields
  page_size?: string;
  security_level?: string;
  password?: string;
  permissions?: {
    printing: boolean;
    copying: boolean;
    annotations: boolean;
    form_filling: boolean;
    assembly: boolean;
    extraction: boolean;
    page_rotation: boolean;
    degraded_printing: boolean;
    screen_reader: boolean;
    metadata_modification: boolean;
  };
  // Non-PDF fields
  resolution?: string;
  password_protection?: {
    enabled: boolean;
    password?: string;
  };
};

/**
 * Type definition for export logging data
 */
type ExportLogData = {
  exportId: string;
  caseId: string;
  format: string;
  // PDF-specific fields
  pageSize?: string;
  securityLevel?: string;
  passwordProtected?: boolean;
  permissionsProtected?: boolean;
  // Non-PDF fields
  resolution?: string;
};

/**
 * Triggers the backend worker to start an export process for a case.
 *
 * This function acts as a durable bridge between the Next.js frontend and the
 * FastAPI backend. It ensures that the export request is reliably sent and
 * handles failures by updating the export status in the database.
 */
export const exportCaseData = inngest.createFunction(
  {
    id: "fastapi-export-case-data",
    name: "FastAPI Export Case Data",
    retries: 2,
    onFailure: async ({ error, event }) => {
      const originalEvent = event.data.event;

      // Type guard using the correct path.
      if (originalEvent.name === "export/case.data.requested") {
        const { exportId } = originalEvent.data;

        // A safeguard to ensure a valid exportId.
        if (typeof exportId !== "string") {
          logError(
            inngestLogger,
            "Could not find a valid exportId in onFailure event data",
            new Error("Invalid exportId type"),
            { event, function: "fastapi-export-case-data" }
          );
          return;
        }

        // If the function fails, update the corresponding export record.
        await db
          .update(exports)
          .set({
            status: "failed",
            failureReason: `Export failed: ${error.message}`,
          })
          .where(eq(exports.id, exportId));

        logError(exportLogger, "Export process failed", error, {
          exportId,
          function: "fastapi-export-case-data",
        });
      }
    },
  },
  { event: "export/case.data.requested" },
  async ({ event, step }) => {
    // In the main handler, the type is correctly inferred automatically.
    const { exportId, caseId, format } = event.data;
    const eventData = event.data;

    // Extract format-specific parameters based on format type
    let resolution: string | undefined;
    let passwordProtection: { enabled: boolean; password?: string } | undefined;
    let pageSize: string | undefined;
    let securityLevel: string | undefined;
    let password: string | undefined;
    let permissions: PdfPermissions | undefined;

    if (eventData.format === "labelled_images") {
      resolution = eventData.resolution;
      passwordProtection = eventData.passwordProtection;
    } else if (eventData.format === "raw_data") {
      passwordProtection = eventData.passwordProtection;
    } else if (eventData.format === "pdf") {
      pageSize = eventData.pageSize;
      securityLevel = eventData.securityLevel;
      password = eventData.password;
      permissions = eventData.permissions;
    }

    // Update the export status to 'processing'.
    await step.run("update-export-status-to-processing", async () => {
      await db.update(exports).set({ status: "processing" }).where(eq(exports.id, exportId));
    });

    // Retrieve necessary secrets and configuration from environment variables.
    const fastApiUrl = env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = env.FASTAPI_SECRET_KEY;

    // Call the FastAPI worker to perform the actual export.
    const result = await step.run("trigger-export-worker", async () => {
      const endpoint = `${fastApiUrl}/v1/export/`;

      // Build the base payload
      const payload: ExportPayload = {
        export_id: exportId,
        case_id: caseId,
        format: format,
      };

      // Add format-specific parameters
      if (format === "pdf") {
        // PDF-specific parameters
        payload.page_size = pageSize;
        payload.security_level = securityLevel;

        // Add password if provided for protected security levels
        if (
          password &&
          (securityLevel === "view_protected" || securityLevel === "permissions_protected")
        ) {
          payload.password = password;
        }

        // Add permissions if provided for permissions-protected security level
        if (permissions && securityLevel === "permissions_protected") {
          payload.permissions = {
            printing: permissions.printing,
            copying: permissions.copying,
            annotations: permissions.annotations,
            form_filling: permissions.formFilling,
            assembly: permissions.assembly,
            extraction: permissions.extraction,
            page_rotation: permissions.pageRotation,
            degraded_printing: permissions.degradedPrinting,
            screen_reader: permissions.screenReader,
            metadata_modification: permissions.metadataModification,
          };
        }
      } else {
        // Non-PDF formats (raw_data, labelled_images)
        if (resolution) {
          payload.resolution = resolution;
        }

        // Handle password protection for non-PDF formats
        payload.password_protection = passwordProtection
          ? {
              enabled: passwordProtection.enabled,
              password: passwordProtection.password,
            }
          : { enabled: false };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`FastAPI export worker failed: ${await response.text()}`);
      }

      return await response.json();
    });

    // Handle updating the final status to 'completed' or 'failed'.
    const logData: ExportLogData = {
      exportId,
      caseId,
      format,
    };

    // Add format-specific logging data
    if (format === "pdf") {
      logData.pageSize = pageSize;
      logData.securityLevel = securityLevel;
      logData.passwordProtected = !!(
        password &&
        (securityLevel === "view_protected" || securityLevel === "permissions_protected")
      );
      logData.permissionsProtected = securityLevel === "permissions_protected";
    } else {
      logData.resolution = resolution;
      logData.passwordProtected = passwordProtection?.enabled ?? false;
    }

    exportLogger.info(logData, "Export job successfully dispatched to FastAPI");
    return {
      message: `Successfully dispatched export job to FastAPI for exportId: ${exportId}`,
      result,
    };
  }
);
