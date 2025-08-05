"use server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { caseAuditLogs, cases } from "@/db/schema";

/**
 * Fetches the complete audit log history for a single case.
 * It ensures the requesting user owns the case before returning data.
 *
 * @param caseId The ID of the case for which to fetch the history.
 * @returns A promise that resolves to an array of audit log entries with user details.
 */
export const getCaseHistory = async (caseId: string) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // First, verify that the user has access to this case.
  const caseAccess = await db.query.cases.findFirst({
    columns: { id: true },
    where: and(eq(cases.id, caseId), eq(cases.userId, session.user.id)),
  });

  if (!caseAccess) {
    throw new Error("Case not found or access denied.");
  }

  // Fetch all audit logs for the given case, ordered by the most recent first.
  const history = await db.query.caseAuditLogs.findMany({
    where: eq(caseAuditLogs.caseId, caseId),
    with: {
      user: {
        columns: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: [desc(caseAuditLogs.timestamp)],
  });

  return history;
};
