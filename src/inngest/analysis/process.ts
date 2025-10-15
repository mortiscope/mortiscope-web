import { eq } from "drizzle-orm";

import { db } from "@/db";
import { analysisResults } from "@/db/schema";
import { env } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { analysisLogger, inngestLogger, logError } from "@/lib/logger";

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
          logError(
            inngestLogger,
            "Could not find a valid caseId in onFailure event data",
            new Error("Invalid caseId type"),
            { event, function: "fastapi-analysis-event" }
          );
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

        logError(analysisLogger, "Analysis process failed", error, {
          caseId,
          function: "fastapi-analysis-event",
        });
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
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Create `AbortController` for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000);

        try {
          // Import undici dynamically to configure custom agent with extended timeouts
          const { Agent, setGlobalDispatcher, getGlobalDispatcher } = await import("undici");

          // Store the original dispatcher to restore later
          const originalDispatcher = getGlobalDispatcher();

          // Create a custom agent with extended timeouts for long-running requests
          const customAgent = new Agent({
            headersTimeout: 30 * 60 * 1000,
            bodyTimeout: 30 * 60 * 1000,
            keepAliveTimeout: 30 * 60 * 1000,
            keepAliveMaxTimeout: 30 * 60 * 1000,
          });

          // Set the custom dispatcher for this request
          setGlobalDispatcher(customAgent);

          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Api-Key": fastApiSecret,
              },
              body: JSON.stringify({ case_id: caseId }),
              signal: controller.signal,
            });

            // Restore the original dispatcher
            setGlobalDispatcher(originalDispatcher);
            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              const error = new Error(`FastAPI analysis endpoint failed: ${errorText}`);

              // Check if this is a database connection error
              if (
                errorText.includes("Database connection error") ||
                errorText.includes("SSL connection has been closed") ||
                errorText.includes("psycopg.OperationalError")
              ) {
                analysisLogger.warn(
                  { caseId, attempt, maxRetries },
                  `Database connection error on attempt ${attempt}/${maxRetries}, will retry`
                );

                lastError = error;

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                  continue;
                }
              }

              throw error;
            }

            // Success - return the result
            const result = await response.json();

            if (attempt > 1) {
              analysisLogger.info(
                { caseId, attempt },
                `Analysis succeeded on attempt ${attempt} after database connection issues`
              );
            }

            return result;
          } catch (fetchError) {
            // Ensure to restore the original dispatcher even if fetch fails
            setGlobalDispatcher(originalDispatcher);
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Analysis request timed out after 20 minutes");
          }

          lastError = error as Error;

          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            break;
          }

          // For other errors, wait before retrying
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      // All retries failed if this point was reached
      throw lastError || new Error("Analysis failed after all retry attempts");
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
      analysisLogger.info({ caseId }, "Analysis completed with no objects detected");
      return { message: "Workflow ended early: No objects detected." };
    }

    // Check if the user cancelled the analysis while FastAPI was processing.
    const isCancelled = await step.run("check-if-cancelled", async () => {
      const record = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, caseId),
        columns: { caseId: true },
      });
      return !record;
    });

    if (isCancelled) {
      analysisLogger.info({ caseId }, "Analysis was cancelled by user, skipping save");
      return { message: `Analysis cancelled for case: ${caseId}` };
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
    analysisLogger.info(
      {
        caseId,
        totalCounts: fullAnalysisResult.aggregated_results.total_counts,
        oldestStage: fullAnalysisResult.aggregated_results.oldest_stage_detected,
        pmiDays: fullAnalysisResult.pmi_estimation?.pmi_days,
      },
      "Analysis completed successfully"
    );
    return { message: `Successfully completed analysis for case: ${caseId}` };
  }
);
