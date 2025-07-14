"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

// Schema for input validation using Zod.
const deleteCaseSchema = z.object({
  caseId: z.string().cuid2("Invalid case ID format."),
});

/**
 * Deletes a specific case for the currently authenticated user.
 * It ensures that a user can only delete their own cases.
 *
 * @param {object} values - The values for deleting the case.
 * @param {string} values.caseId - The ID of the case to delete.
 * @returns An object with a success or error message.
 */
export const deleteCase = async (values: z.infer<typeof deleteCaseSchema>) => {
  const validatedFields = deleteCaseSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid input provided." };
  }

  const { caseId } = validatedFields.data;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: "Authentication required. Please sign in." };
  }

  try {
    // Perform the deletion ensuring the case belongs to the current user.
    const result = await db
      .delete(cases)
      .where(and(eq(cases.id, caseId), eq(cases.userId, userId)));

    // Check if a row was actually deleted.
    if (result.rowCount === 0) {
      return { error: "Case not found or you do not have permission to delete it." };
    }

    // Invalidate the cache for the results page to reflect the change.
    revalidatePath("/results");

    return { success: "Case successfully deleted." };
  } catch (error) {
    console.error("Database error while deleting case:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
