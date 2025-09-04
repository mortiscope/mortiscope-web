"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { SAMPLING_DENSITY_ORDER } from "@/lib/constants";

/**
 * A server action to fetch and calculate sampling density metrics
 * for the currently authenticated user. It queries all cases and 
 * buckets them by the number of images (uploads) they contain.
 *
 * @returns A promise that resolves to an array of sampling density counts ordered by image count ranges.
 * @throws An error if the user is not authenticated.
 */
export const getSamplingDensity = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user with their uploads.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    with: {
      uploads: {
        columns: { id: true },
      },
    },
  });

  // Initialize counters for each image count range bucket.
  const rangeCounts: Record<string, number> = {
    "1_to_4": 0,
    "5_to_8": 0,
    "9_to_12": 0,
    "13_to_16": 0,
    "17_to_20": 0,
  };

  // Iterate over each case and bucket by image count.
  userCases.forEach((c) => {
    const imageCount = c.uploads.length;

    // Bucket the case based on its image count.
    if (imageCount >= 1) {
      if (imageCount <= 4) {
        rangeCounts["1_to_4"]++;
      } else if (imageCount <= 8) {
        rangeCounts["5_to_8"]++;
      } else if (imageCount <= 12) {
        rangeCounts["9_to_12"]++;
      } else if (imageCount <= 16) {
        rangeCounts["13_to_16"]++;
      } else if (imageCount <= 20) {
        rangeCounts["17_to_20"]++;
      }
    }
  });

  // Transform the aggregated data into an array format ordered by image count ranges.
  const orderedData = SAMPLING_DENSITY_ORDER.map((range) => ({
    name: range,
    quantity: rangeCounts[range] || 0,
  }));

  return orderedData;
};
