import { eq } from "drizzle-orm";

import { db } from "@/db";
import { exports } from "@/db/schema";
import { env } from "@/lib/env";
import { type Events, inngest } from "@/lib/inngest";

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
    // Update the export status to 'processing'.
    await step.run("update-image-export-status-to-processing", async () => {
      await db
        .update(exports)
        .set({ status: "processing" })
        .where(eq(exports.id, event.data.exportId));
    });

    // Retrieve necessary secrets and configuration.
    const fastApiUrl = env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = env.FASTAPI_SECRET_KEY;

    // Call the FastAPI worker to perform the export.
    const result = await step.run("trigger-image-export-worker", async () => {
      // Type the event data properly
      const eventData = event.data as Events["export/image.data.requested"]["data"];

      // Prepare the payload for the API. It will always have these properties.
      const apiPayload: {
        export_id: string;
        upload_id: string;
        format: string;
        resolution?: string;
        password_protection: {
          enabled: boolean;
          password?: string;
        };
      } = {
        export_id: eventData.exportId,
        upload_id: eventData.uploadId,
        format: eventData.format,
        password_protection: eventData.passwordProtection
          ? {
              enabled: eventData.passwordProtection.enabled,
              password: eventData.passwordProtection.password,
            }
          : { enabled: false },
      };

      // Conditionally add resolution if the format is 'labelled_images'.
      if (eventData.format === "labelled_images") {
        apiPayload.resolution = (
          eventData as Extract<
            Events["export/image.data.requested"]["data"],
            { format: "labelled_images" }
          >
        ).resolution;
      }

      const endpoint = `${fastApiUrl}/v1/export/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        throw new Error(`FastAPI image export worker failed: ${await response.text()}`);
      }

      return await response.json();
    });

    return {
      message: `Successfully dispatched image export job to FastAPI for exportId: ${event.data.exportId}`,
      result,
    };
  }
);
