"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";

// Schema for input validation using Zod.
const deleteSelectedCasesSchema = z.object({
  caseIds: z.array(z.cuid2()).min(1, "At least one case must be selected."),
  currentPassword: z.string().min(1, "Password is required."),
});

/**
 * Deletes multiple cases for the currently authenticated user.
 * Requires password verification before deletion.
 *
 * @param {object} values - The values for deleting cases.
 * @param {string[]} values.caseIds - Array of case IDs to delete.
 * @param {string} values.currentPassword - User's current password for verification.
 * @returns An object with a success or error message.
 */
export const deleteSelectedCases = async (values: z.infer<typeof deleteSelectedCasesSchema>) => {
  const validatedFields = deleteSelectedCasesSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid input provided." };
  }

  const { caseIds, currentPassword } = validatedFields.data;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: "Authentication required. Please sign in." };
  }

  // Verify the user's password first
  const passwordVerification = await verifyCurrentPassword({ currentPassword });

  if (!passwordVerification.success) {
    return { error: "Invalid password." };
  }

  try {
    // Delete all selected cases that belong to the current user
    const result = await db
      .delete(cases)
      .where(and(inArray(cases.id, caseIds), eq(cases.userId, userId)));

    // Check if any rows were actually deleted
    if (result.rowCount === 0) {
      return { error: "No cases found or you do not have permission to delete them." };
    }

    // Revalidate the dashboard page to reflect the changes
    revalidatePath("/dashboard");

    const successMessage =
      result.rowCount === 1
        ? "1 case successfully deleted."
        : `${result.rowCount} cases successfully deleted.`;

    return { success: successMessage };
  } catch (error) {
    console.error("Database error while deleting cases:", error);
    return { error: "An unexpected error occurred." };
  }
};
