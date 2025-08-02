import { eq } from "drizzle-orm";

import { db } from "@/db";
import { analysisResults, cases } from "@/db/schema";
import { env } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { analysisLogger, inngestLogger, logError } from "@/lib/logger";

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
          logError(
            inngestLogger,
            "Could not find a valid caseId in recalculation onFailure",
            new Error("Invalid caseId type"),
            { event, function: "fastapi-recalculate-case" }
          );
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

        logError(analysisLogger, "Recalculation process failed", error, {
          caseId,
          function: "fastapi-recalculate-case",
        });
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
    const fastApiUrl = env.NEXT_PUBLIC_FASTAPI_URL;
    const fastApiSecret = env.FASTAPI_SECRET_KEY;

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

    analysisLogger.info({ caseId }, "Recalculation completed successfully");
    return { message: `Successfully completed recalculation for case: ${caseId}` };
  }
);
