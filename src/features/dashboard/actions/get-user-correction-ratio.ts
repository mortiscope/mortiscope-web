"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * A server action to fetch and calculate user correction metrics.
 * It queries all of the user's active cases and counts verified vs corrected predictions.
 *
 * @returns A promise that resolves to an array of chart data points.
 * @throws An error if the user is not authenticated.
 */
export const getUserCorrectionRatio = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user with their nested detections.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    with: {
      uploads: {
        columns: {},
        with: {
          detections: {
            columns: { status: true },
          },
        },
      },
    },
  });

  // Initialize counters to aggregate the results.
  let verifiedCount = 0;
  let correctedCount = 0;

  // Iterate through the nested data structure to process each detection's status.
  userCases.forEach((c) => {
    c.uploads.forEach((u) => {
      u.detections.forEach((d) => {
        if (d.status === "user_confirmed") {
          // This was a correct prediction by the model that the user verified.
          verifiedCount++;
        } else if (d.status === "user_edited_confirmed") {
          // This was an incorrect prediction that the user manually corrected.
          correctedCount++;
        }
      });
    });
  });

  // Transform the aggregated counts into the final array format required by the interface chart component.
  return [
    { name: "verified_prediction", quantity: verifiedCount },
    { name: "corrected_prediction", quantity: correctedCount },
  ];
};
