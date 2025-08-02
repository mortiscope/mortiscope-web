"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { exports, uploads } from "@/db/schema";
import { type ServerActionResponse } from "@/features/cases/constants/types";
import {
  type RequestImageExportInput,
  requestImageExportSchema,
} from "@/features/export/schemas/export";
import { inngest } from "@/lib/inngest";
import { exportLogger, logError, logUserAction } from "@/lib/logger";

/**
 * Creates an export record for a single image and dispatches an Inngest event.
 */
export const requestImageExport = async (
  values: RequestImageExportInput
): Promise<ServerActionResponse<{ exportId: string }>> => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parseResult = requestImageExportSchema.safeParse(values);
  if (!parseResult.success) return { success: false, error: "Invalid input provided." };
  const { uploadId, format } = parseResult.data;

  try {
    const imageToExport = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, uploadId), eq(uploads.userId, session.user.id)),
      columns: { id: true, caseId: true },
    });
    if (!imageToExport?.caseId)
      return { success: false, error: "Image not found or permission denied." };

    const [newExport] = await db
      .insert(exports)
      .values({ caseId: imageToExport.caseId, userId: session.user.id, format, status: "pending" })
      .returning();

    await inngest.send({
      name: "export/image.data.requested",
      data: { exportId: newExport.id, uploadId, userId: session.user.id, format },
    });

    logUserAction(exportLogger, "image_export_requested", session.user.id, {
      exportId: newExport.id,
      uploadId,
      caseId: imageToExport.caseId,
      format,
    });

    revalidatePath(`/results/${imageToExport.caseId}`);
    return { success: true, data: { exportId: newExport.id } };
  } catch (error) {
    logError(exportLogger, "Failed to initiate image export process", error, {
      userId: session?.user?.id,
      uploadId,
      format,
    });
    return { success: false, error: "An unexpected error occurred. Please try again later." };
  }
};
