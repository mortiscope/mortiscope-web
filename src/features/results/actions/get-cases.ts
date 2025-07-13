"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches all cases associated with the currently authenticated user.
 * The cases are ordered by their creation date in descending order by default.
 * @returns A promise that resolves to an array of cases.
 * @throws An error if the user is not authenticated.
 */
export const getCases = async () => {
  // Retrieve the current session to identify the user.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Query the database for all cases belonging to the current user.
  const userCases = await db.query.cases.findMany({
    where: eq(cases.userId, session.user.id),
    orderBy: (cases, { desc }) => [desc(cases.createdAt)],
  });

  return userCases;
};
