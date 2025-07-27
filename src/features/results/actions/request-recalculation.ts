"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { inngest } from "@/lib/inngest";

/**
 * Sends an event to Inngest to trigger a background PMI recalculation for a case.
 *
 * This action is designed to be called from the client. It authenticates the user
 * and then dispatches a job to Inngest, which will handle the actual communication
 * with the FastAPI backend.
 *
 * @param {object} params - The parameters for the recalculation request.
 * @param {string} params.caseId - The ID of the case to be recalculated.
 * @returns {Promise<{success?: string; error?: string}>} An object indicating the result.
 */
export const requestRecalculation = async ({
  caseId,
}: {
  caseId: string;
}): Promise<{ success?: string; error?: string }> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    // Send the event to Inngest to start the background job.
    await inngest.send({
      name: "recalculation/case.requested",
      data: {
        caseId,
      },
    });

    // Revalidate the path to ensure any immediate interface changes are reflected.
    revalidatePath(`/results/${caseId}`);

    return { success: "Recalculation has been started." };
  } catch (error) {
    console.error("Failed to send recalculation request:", error);
    return { error: "An unexpected error occurred while starting the recalculation." };
  }
};
