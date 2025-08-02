import { eq } from "drizzle-orm";

import { db } from "@/db";
import { exports } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Triggers the backend worker to start an export process for a single image.
 *
 * This function is responsible for dispatching single-image export jobs to the
 * FastAPI backend to ensure the request is durable and handling failures gracefully.
 */
export const exportImageData = inngest.createFunction(
  {
    id: "fastapi-export-image-data",
    name: "FastAPI Export Image Data",
    retries: 2,
    onFailure: async ({ error, event }) => {
      const originalEvent = event.data.event;

      // Type guard for the new single-image export event.
      if (originalEvent.name === "export/image.data.requested") {
        const { exportId } = originalEvent.data;

        if (typeof exportId !== "string") {
          console.error("Could not find a valid exportId in onFailure for image export.", event);
          return;
        }

        // Update the export record with the failure status.
        await db
          .update(exports)
          .set({
            status: "failed",
            failureReason: `Image export failed: ${error.message}`,
          })
          .where(eq(exports.id, exportId));
      }
    },
  },
  { event: "export/image.data.requested" },
  async ({ event, step }) => {
    const { exportId, uploadId, format } = event.data;

    // Update the export status to 'processing'.
    await step.run("update-image-export-status-to-processing", async () => {
      await db.update(exports).set({ status: "processing" }).where(eq(exports.id, exportId));
    });

    // Retrieve necessary secrets and configuration.
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = process.env.FASTAPI_SECRET_KEY;

    if (!fastApiUrl || !fastApiSecret) {
      throw new Error("FastAPI URL or Secret Key is not configured in .env");
    }

    // Call the FastAPI worker to perform the export.
    const result = await step.run("trigger-image-export-worker", async () => {
      const endpoint = `${fastApiUrl}/v1/export/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify({
          export_id: exportId,
          upload_id: uploadId,
          format: format,
        }),
      });

      if (!response.ok) {
        throw new Error(`FastAPI image export worker failed: ${await response.text()}`);
      }

      return await response.json();
    });

    return {
      message: `Successfully dispatched image export job to FastAPI for exportId: ${exportId}`,
      result,
    };
  }
);
