"use server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches all active cases associated with the currently authenticated user.
 * Draft cases are excluded. The cases are ordered by their creation date in descending order by default.
 *
 * @returns A promise that resolves to an array of cases.
 * @throws An error if the user is not authenticated.
 */
export const getCases = async () => {
  // Retrieve the current session to identify the user.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Query the database for all cases belonging to the current user that are 'active'.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    orderBy: [desc(cases.createdAt)],
    with: {
      uploads: {
        columns: { id: true },
        with: {
          detections: {
            columns: { status: true },
          },
        },
      },
    },
  });

  // Transform the result to include the 'verificationStatus' and 'hasDetections' properties.
  return userCases.map((c) => {
    const allDetections = c.uploads.flatMap((u) => u.detections);
    const hasDetections = allDetections.length > 0;
    const unverifiedCount = allDetections.filter((d) => d.status === "model_generated").length;
    const totalCount = allDetections.length;
    const verifiedCount = totalCount - unverifiedCount;

    let verificationStatus: "verified" | "in_progress" | "unverified" | "no_detections" =
      "no_detections";

    if (!hasDetections) {
      verificationStatus = "no_detections";
    } else if (unverifiedCount === 0) {
      verificationStatus = "verified";
    } else if (unverifiedCount === totalCount) {
      verificationStatus = "unverified";
    } else {
      verificationStatus = "in_progress";
    }

    return {
      ...c,
      verificationStatus,
      hasDetections,
      totalDetections: totalCount,
      verifiedDetections: verifiedCount,
    };
  });
};
