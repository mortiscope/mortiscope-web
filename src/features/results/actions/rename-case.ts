"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

// Defines the schema for validating the input to the renameCase action
const renameCaseSchema = z.object({
  caseId: z.string().cuid2("Invalid case ID."),
  newName: z
    .string()
    .min(1, "Case name cannot be empty.")
    .max(256, "Case name cannot exceed 256 characters."),
});

/**
 * A server action to rename a specific case for the authenticated user.
 * It validates the input, checks permissions, and updates the database.
 *
 * @param {z.infer<typeof renameCaseSchema>} values - The validated input containing the case ID and the new name.
 * @returns {Promise<{ success: string } | { error: string }>} An object indicating the result of the operation.
 */
export const renameCase = async (values: z.infer<typeof renameCaseSchema>) => {
  const session = await auth();

  // Ensure the user is authenticated
  if (!session?.user?.id) {
    return { error: "You must be logged in to rename a case." };
  }
  const userId = session.user.id;

  // Validate the input against the schema
  const validatedFields = renameCaseSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid input. Please check the details and try again." };
  }
  const { caseId, newName } = validatedFields.data;

  try {
    // Find the case to ensure it exists and belongs to the current user
    const existingCase = await db.query.cases.findFirst({
      where: and(eq(cases.id, caseId), eq(cases.userId, userId)),
      columns: { id: true },
    });

    if (!existingCase) {
      return { error: "Case not found or you don't have permission to rename it." };
    }

    // Update the case name in the database
    await db.update(cases).set({ caseName: newName }).where(eq(cases.id, caseId));

    // Invalidate the cache for the results page to reflect the change immediately
    revalidatePath("/results");

    return { success: "Case renamed successfully." };
  } catch (error) {
    // Handle potential database errors, such as unique constraint violations
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return { error: "A case with this name already exists. Please choose a different name." };
    }
    console.error("[RENAME_CASE_ERROR]", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
