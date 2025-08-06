import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { analysisResults, caseAuditLogs, cases } from "@/db/schema";
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

    // Capture the old PMI values before recalculation for audit logging
    const oldAnalysisResult = await step.run("capture-old-pmi-values", async () => {
      const result = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, caseId),
      });
      return result;
    });

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

    // On success, finalize the process in the database and create audit log.
    await step.run("finalize-recalculation-status", async () => {
      // Set the flag back to false, indicating the job is done.
      await db.update(cases).set({ recalculationNeeded: false }).where(eq(cases.id, caseId));
      // Set the analysis status back to 'completed'.
      await db
        .update(analysisResults)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(analysisResults.caseId, caseId));
    });

    // Create audit log for PMI recalculation
    await step.run("create-pmi-audit-log", async () => {
      // Get the case to find the user who triggered the recalculation
      const caseData = await db.query.cases.findFirst({
        where: eq(cases.id, caseId),
      });

      if (!caseData || !oldAnalysisResult) {
        analysisLogger.warn(
          { caseId },
          "Could not create PMI audit log - missing case or old analysis data"
        );
        return;
      }

      // Get the new PMI values after recalculation
      const newAnalysisResult = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, caseId),
      });

      if (!newAnalysisResult) {
        analysisLogger.warn(
          { caseId },
          "Could not create PMI audit log - missing new analysis data"
        );
        return;
      }

      // Only create audit log if PMI values actually changed
      const oldPmiMinutes = oldAnalysisResult.pmiMinutes;
      const newPmiMinutes = newAnalysisResult.pmiMinutes;

      if (oldPmiMinutes !== newPmiMinutes) {
        const batchId = createId();

        // Store all PMI values (minutes, hours, days) for comprehensive display
        const oldPmiValues = {
          minutes: oldAnalysisResult.pmiMinutes,
          hours: oldAnalysisResult.pmiHours,
          days: oldAnalysisResult.pmiDays,
        };

        const newPmiValues = {
          minutes: newAnalysisResult.pmiMinutes,
          hours: newAnalysisResult.pmiHours,
          days: newAnalysisResult.pmiDays,
        };

        await db.insert(caseAuditLogs).values({
          caseId,
          userId: caseData.userId,
          batchId,
          field: "pmiRecalculation",
          oldValue: oldPmiValues,
          newValue: newPmiValues,
        });

        analysisLogger.info(
          {
            caseId,
            oldPmiMinutes,
            newPmiMinutes,
          },
          "PMI recalculation audit log created"
        );
      }
    });

    analysisLogger.info({ caseId }, "Recalculation completed successfully");
    return { message: `Successfully completed recalculation for case: ${caseId}` };
  }
);
