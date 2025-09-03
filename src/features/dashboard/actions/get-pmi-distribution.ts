"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { PMI_INTERVAL_ORDER } from "@/lib/constants";

/**
 * A server action to fetch and calculate PMI distribution metrics
 * for the currently authenticated user. It queries all cases with PMI results
 * and buckets them into time intervals.
 *
 * @returns A promise that resolves to an array of PMI interval counts ordered by time.
 * @throws An error if the user is not authenticated.
 */
export const getPmiDistribution = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user with their analysis results.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    with: {
      analysisResult: {
        columns: {
          pmiHours: true,
        },
      },
    },
  });

  // Initialize counters for each time interval bucket.
  const intervalCounts: Record<string, number> = {
    less_than_12h: 0,
    "12_to_24h": 0,
    "24_to_36h": 0,
    "36_to_48h": 0,
    "48_to_60h": 0,
    "60_to_72h": 0,
    more_than_72h: 0,
  };

  // Iterate over each case and bucket by PMI hours.
  userCases.forEach((c) => {
    const pmiHours = c.analysisResult?.pmiHours;

    // Only count cases that have a valid PMI result.
    if (pmiHours != null && pmiHours >= 0) {
      if (pmiHours < 12) {
        intervalCounts.less_than_12h++;
      } else if (pmiHours < 24) {
        intervalCounts["12_to_24h"]++;
      } else if (pmiHours < 36) {
        intervalCounts["24_to_36h"]++;
      } else if (pmiHours < 48) {
        intervalCounts["36_to_48h"]++;
      } else if (pmiHours < 60) {
        intervalCounts["48_to_60h"]++;
      } else if (pmiHours < 72) {
        intervalCounts["60_to_72h"]++;
      } else {
        intervalCounts.more_than_72h++;
      }
    }
  });

  // Transform the aggregated data into an array format ordered by time intervals.
  const orderedData = PMI_INTERVAL_ORDER.map((interval) => ({
    name: interval,
    quantity: intervalCounts[interval] || 0,
  }));

  return orderedData;
};
