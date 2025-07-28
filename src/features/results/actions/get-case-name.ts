"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches the name of a specific case from the database.
 *
 * @param {string} caseId The unique identifier of the case.
 * @returns {Promise<string | null>} The case name, or null if not found.
 */
export const getCaseName = async (caseId: string): Promise<string | null> => {
  try {
    const result = await db.query.cases.findFirst({
      where: eq(cases.id, caseId),
      columns: {
        caseName: true,
      },
    });

    return result?.caseName ?? null;
  } catch (error) {
    console.error("Failed to fetch case name:", error);
    return null;
  }
};
