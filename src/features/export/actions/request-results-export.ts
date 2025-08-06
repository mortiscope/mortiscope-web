"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, exports } from "@/db/schema";
import { type ServerActionResponse } from "@/features/cases/constants/types";
import {
  type RequestResultsExportInput,
  requestResultsExportSchema,
} from "@/features/export/schemas/export";
import { inngest } from "@/lib/inngest";

/**
 * Creates a new export record and dispatches an Inngest event to trigger the asynchronous export process.
 */
export const requestResultsExport = async (
  values: RequestResultsExportInput
): Promise<ServerActionResponse<{ exportId: string }>> => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parseResult = requestResultsExportSchema.safeParse(values);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues[0]?.message ?? "Invalid input provided.";
    return { success: false, error: errorMessage };
  }
  const { caseId, format } = parseResult.data;

  try {
    const caseToExport = await db.query.cases.findFirst({
      where: and(eq(cases.id, caseId), eq(cases.userId, session.user.id)),
      columns: { id: true },
    });
    if (!caseToExport) return { success: false, error: "Case not found or permission denied." };

    const [newExport] = await db
      .insert(exports)
      .values({ caseId, userId: session.user.id, format, status: "pending" })
      .returning();

    await inngest.send({
      name: "export/case.data.requested",
      data: {
        exportId: newExport.id,
        userId: session.user.id,
        ...parseResult.data,
      },
    });

    revalidatePath(`/results/${caseId}`);
    return { success: true, data: { exportId: newExport.id } };
  } catch (error) {
    console.error("Failed to initiate export process:", error);
    return { success: false, error: "An unexpected error occurred. Please try again later." };
  }
};
