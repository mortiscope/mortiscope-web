"use server";

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches the complete data for a single case, including its relations.
 * This server action is intended to be used by client-side data fetching hooks.
 *
 * @param caseId The ID of the case to fetch.
 * @returns The full case data object.
 */
export const getCaseById = async (caseId: string) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const caseData = await db.query.cases.findFirst({
    where: and(eq(cases.id, caseId), eq(cases.userId, session.user.id)),
    with: {
      uploads: {
        with: {
          detections: true,
        },
      },
      analysisResult: true,
    },
  });

  if (!caseData) {
    notFound();
  }

  return caseData;
};
