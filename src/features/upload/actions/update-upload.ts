"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { logError, uploadLogger } from "@/lib/logger";

// Define the schema for updating an upload record.
const updateUploadSchema = z.object({
  id: z.string().cuid2({ message: "A valid upload ID is required." }),
  name: z.string().optional(),
  size: z.number().optional(),
  type: z.string().optional(),
  key: z.string().optional(),
  url: z.string().url().optional(),
});

type UpdateUploadInput = z.infer<typeof updateUploadSchema>;

type ActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Updates the metadata of an existing upload in the database.
 *
 * @param values - An object containing the upload ID and the fields to update.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function updateUpload(values: UpdateUploadInput): Promise<ActionResponse> {
  // Authenticate the user session.
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  // Validate the input on the server.
  const parseResult = updateUploadSchema.safeParse(values);
  if (!parseResult.success) {
    return { success: false, error: "Invalid input provided for updating upload." };
  }

  const { id, ...updateData } = parseResult.data;

  // Ensure there's at least one field to update besides the ID.
  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No update data provided." };
  }

  try {
    // Find the existing upload to ensure it belongs to the current user.
    const existingUpload = await db.query.uploads.findFirst({
      where: eq(uploads.id, id),
      columns: { userId: true },
    });

    if (!existingUpload) {
      return { success: false, error: "Upload not found." };
    }

    if (existingUpload.userId !== userId) {
      return { success: false, error: "Forbidden: You do not own this upload." };
    }

    // Perform the update operation.
    await db.update(uploads).set(updateData).where(eq(uploads.id, id));

    return { success: true };
  } catch (error) {
    logError(uploadLogger, "Error updating upload metadata", error, {
      userId,
      uploadId: id,
      updateData,
    });
    return { success: false, error: "Failed to update upload details in the database." };
  }
}
