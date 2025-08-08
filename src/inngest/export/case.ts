import { eq } from "drizzle-orm";

import { db } from "@/db";
import { exports } from "@/db/schema";
import { env } from "@/lib/env";
import { type Events, inngest } from "@/lib/inngest";
import { exportLogger, inngestLogger, logError } from "@/lib/logger";

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
    const { exportId, caseId, format, resolution } = event.data;
    const eventData = event.data as Events["export/case.data.requested"]["data"];
    const passwordProtection = eventData.passwordProtection;

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

      const payload = {
        export_id: exportId,
        case_id: caseId,
        format: format,
        resolution: resolution,
        password_protection: passwordProtection
          ? {
              enabled: passwordProtection.enabled,
              password: passwordProtection.password,
            }
          : { enabled: false },
      };

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
    exportLogger.info(
      {
        exportId,
        caseId,
        format,
        resolution,
        passwordProtected: passwordProtection?.enabled ?? false,
      },
      "Export job successfully dispatched to FastAPI"
    );
    return {
      message: `Successfully dispatched export job to FastAPI for exportId: ${exportId}`,
      result,
    };
  }
);
