"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches the most recent 'draft' case for the currently authenticated user.
 * This is used to restore an in-progress analysis session.
 *
 * @returns A promise that resolves to the draft case object if found, otherwise null.
 */
export const getDraftCase = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    // Return null if the user is not authenticated, as there can be no draft.
    return null;
  }

  try {
    const draftCase = await db.query.cases.findFirst({
      where: and(eq(cases.userId, session.user.id), eq(cases.status, "draft")),
      orderBy: (cases, { desc }) => [desc(cases.createdAt)],
    });

    return draftCase ?? null;
  } catch (error) {
    console.error("Error fetching draft case:", error);
    // In case of a database error, it's safer to return null and let the user start fresh.
    return null;
  }
};
