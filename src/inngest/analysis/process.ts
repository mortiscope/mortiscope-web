import { eq } from "drizzle-orm";

import { db } from "@/db";
import { analysisResults } from "@/db/schema";
import { env } from "@/lib/env";
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

        // A safeguard to ensure not to proceed if caseId is not a string.
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
    const fastApiUrl = env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = env.FASTAPI_SECRET_KEY;

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
