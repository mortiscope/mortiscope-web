import { eq } from "drizzle-orm";

import { db } from "@/db";
import { analysisResults, cases, exports } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Orchestrates the entire multi-step analysis process for a given case.
 *
 * This function is the backbone of the analysis workflow. It is triggered when a
 * case is created and is responsible for calling the FastAPI services for object
 * detection and PMI computation, and then saving the final results.
 */
export const analysisEvent = inngest.createFunction(
  // Configuration for the Inngest function.
  {
    id: "fastapi-analysis-event",
    name: "FastAPI Analysis Event",
    // Configure automatic retries on failure.
    retries: 2,
    // Add a failure handler to update the status in the database.
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event;

      // Type guard using the correct path.
      if (originalEvent.name === "analysis/request.sent") {
        const { caseId } = originalEvent.data;

        // A safeguard to ensure we don't proceed if caseId is not a string.
        if (typeof caseId !== "string") {
          console.error("Could not find a valid caseId in onFailure event data.", event);
          return;
        }

        await db
          .update(analysisResults)
          .set({
            status: "failed",
            explanation: `Analysis failed: ${error.message}`,
            updatedAt: new Date(),
          })
          .where(eq(analysisResults.caseId, caseId));
      }
    },
  },
  { event: "analysis/request.sent" },
  async ({ event, step }) => {
    const { caseId } = event.data;

    // A sleep step to give the user's browser time to upload files before the analysis process attempts to access them.
    await step.sleep("wait-for-uploads", "1m");

    // Update status to 'processing' before calling the external API.
    await step.run("update-status-to-processing", async () => {
      await db
        .update(analysisResults)
        .set({ status: "processing" })
        .where(eq(analysisResults.caseId, caseId));
    });

    // Retrieve necessary secrets and configuration from environment variables.
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = process.env.FASTAPI_SECRET_KEY;

    // Fail the function run if essential configuration is missing. Inngest will retry.
    if (!fastApiUrl || !fastApiSecret) {
      throw new Error("FastAPI URL or Secret Key is not configured in .env");
    }

    // Executes the primary analysis by calling the FastAPI endpoint.
    const fullAnalysisResult = await step.run("run-full-fastapi-analysis", async () => {
      const endpoint = `${fastApiUrl}/v1/detect`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify({ case_id: caseId }),
      });

      if (!response.ok) {
        throw new Error(`FastAPI analysis endpoint failed: ${await response.text()}`);
      }
      return await response.json();
    });

    // Check if the analysis yielded any detectable results.
    if (
      !fullAnalysisResult?.aggregated_results?.total_counts ||
      !fullAnalysisResult?.aggregated_results?.oldest_stage_detected
    ) {
      // If detection yields no results, update the record to 'completed' with an explanation.
      await step.run("save-no-detection-result", async () => {
        await db
          .update(analysisResults)
          .set({
            status: "completed",
            explanation:
              "Analysis complete. No insect evidence was detected in the provided images.",
            updatedAt: new Date(),
          })
          .where(eq(analysisResults.caseId, caseId));
      });
      // End the function run early with a clear message for monitoring.
      return { message: "Workflow ended early: No objects detected." };
    }

    // Saves the final results from the single API call to the primary database.
    await step.run("save-analysis-results", async () => {
      const { aggregated_results, pmi_estimation, explanation } = fullAnalysisResult;
      // This 'update' operation populates the existing record with the full results.
      await db
        .update(analysisResults)
        .set({
          status: "completed",
          totalCounts: aggregated_results.total_counts,
          oldestStageDetected: aggregated_results.oldest_stage_detected,
          pmiSourceImageKey: pmi_estimation?.source_image_key,
          pmiDays: pmi_estimation?.pmi_days,
          pmiHours: pmi_estimation?.pmi_hours,
          pmiMinutes: pmi_estimation?.pmi_minutes,
          stageUsedForCalculation: pmi_estimation?.stage_used_for_calculation,
          temperatureProvided: pmi_estimation?.temperature_provided,
          calculatedAdh: pmi_estimation?.calculated_adh,
          ldtUsed: pmi_estimation?.ldt_used,
          explanation,
          updatedAt: new Date(),
        })
        .where(eq(analysisResults.caseId, caseId));
    });

    // The final return indicates the successful completion of the workflow.
    return { message: `Successfully completed analysis for case: ${caseId}` };
  }
);

/**
 * Handles the background recalculation of a case's PMI.
 *
 * This function is triggered when a recalculation is requested. It updates the
 * case status to processing for immediate user feedback, calls the FastAPI
 * recalculation endpoint, and upon success, resets the case's
 * `recalculationNeeded` flag to false.
 */
export const recalculateCase = inngest.createFunction(
  {
    id: "fastapi-recalculate-case",
    name: "FastAPI Recalculate Case",
    retries: 2,
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event;
      // Type guard for new event.
      if (originalEvent.name === "recalculation/case.requested") {
        const { caseId } = originalEvent.data;
        if (typeof caseId !== "string") {
          console.error("Could not find a valid caseId in recalculation onFailure.", event);
          return;
        }
        // Update the analysis status to 'failed' to provide feedback.
        await db
          .update(analysisResults)
          .set({
            status: "failed",
            explanation: `Recalculation failed: ${error.message}`,
            updatedAt: new Date(),
          })
          .where(eq(analysisResults.caseId, caseId));
      }
    },
  },
  { event: "recalculation/case.requested" },
  async ({ event, step }) => {
    const { caseId } = event.data;

    // Update status to 'processing' for immediate user feedback.
    await step.run("update-status-to-processing", async () => {
      await db
        .update(analysisResults)
        .set({ status: "processing" })
        .where(eq(analysisResults.caseId, caseId));
    });

    // Retrieve necessary secrets and configuration.
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = process.env.FASTAPI_SECRET_KEY;

    if (!fastApiUrl || !fastApiSecret) {
      throw new Error("FastAPI URL or Secret Key is not configured in .env");
    }

    // Call the FastAPI endpoint to perform the recalculation.
    await step.run("run-fastapi-recalculation", async () => {
      const endpoint = `${fastApiUrl}/v1/computation/recalculate`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify({ case_id: caseId }),
      });

      if (!response.ok) {
        throw new Error(`FastAPI recalculation endpoint failed: ${await response.text()}`);
      }
      return await response.json();
    });

    // On success, finalize the process in the database.
    await step.run("finalize-recalculation-status", async () => {
      // Set the flag back to false, indicating the job is done.
      await db.update(cases).set({ recalculationNeeded: false }).where(eq(cases.id, caseId));
      // Set the analysis status back to 'completed'.
      await db
        .update(analysisResults)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(analysisResults.caseId, caseId));
    });

    return { message: `Successfully completed recalculation for case: ${caseId}` };
  }
);

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

        // A safeguard to ensure we have a valid exportId.
        if (typeof exportId !== "string") {
          console.error("Could not find a valid exportId in onFailure event data.", event);
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
      }
    },
  },
  { event: "export/case.data.requested" },
  async ({ event, step }) => {
    // In the main handler, the type is correctly inferred automatically.
    const { exportId, caseId, format } = event.data;

    // Update the export status to 'processing'.
    await step.run("update-export-status-to-processing", async () => {
      await db.update(exports).set({ status: "processing" }).where(eq(exports.id, exportId));
    });

    // Retrieve necessary secrets and configuration from environment variables.
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = process.env.FASTAPI_SECRET_KEY;

    if (!fastApiUrl || !fastApiSecret) {
      throw new Error("FastAPI URL or Secret Key is not configured in .env");
    }

    // Call the FastAPI worker to perform the actual export.
    const result = await step.run("trigger-export-worker", async () => {
      const endpoint = `${fastApiUrl}/v1/export/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastApiSecret,
        },
        body: JSON.stringify({
          export_id: exportId,
          case_id: caseId,
          format: format,
        }),
      });

      if (!response.ok) {
        throw new Error(`FastAPI export worker failed: ${await response.text()}`);
      }

      return await response.json();
    });

    // Handle updating the final status to 'completed' or 'failed'.
    return {
      message: `Successfully dispatched export job to FastAPI for exportId: ${exportId}`,
      result,
    };
  }
);

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
