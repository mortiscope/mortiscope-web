"use server";

import { and, eq, gte, isNotNull, lte } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * A server action to fetch and calculate the distribution of confidence scores
 * for detections. It buckets the confidence scores into 10% intervals.
 *
 * @param startDate - Optional start date to filter cases by caseDate.
 * @param endDate - Optional end date to filter cases by caseDate.
 * @returns A promise that resolves to an array of bucketed confidence data.
 * @throws An error if the user is not authenticated.
 */
export const getConfidenceScoreDistribution = async (startDate?: Date, endDate?: Date) => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Build the where clause with optional date filtering.
  const whereConditions = [eq(cases.userId, session.user.id), eq(cases.status, "active")];
  if (startDate) {
    whereConditions.push(gte(cases.caseDate, startDate));
  }
  if (endDate) {
    whereConditions.push(lte(cases.caseDate, endDate));
  }

  // Fetch all active cases for the user with their nested detections.
  const userCases = await db.query.cases.findMany({
    where: and(...whereConditions),
    with: {
      uploads: {
        columns: {},
        with: {
          detections: {
            columns: {
              originalConfidence: true,
            },
            // Filter out soft-deleted detections or those without a confidence score.
            where: (detections, { isNull, and }) =>
              and(isNull(detections.deletedAt), isNotNull(detections.originalConfidence)),
          },
        },
      },
    },
  });

  // Initialize the buckets for aggregating the confidence scores.
  const buckets: Record<string, number> = {
    "0-10%": 0,
    "10-20%": 0,
    "20-30%": 0,
    "30-40%": 0,
    "40-50%": 0,
    "50-60%": 0,
    "60-70%": 0,
    "70-80%": 0,
    "80-90%": 0,
    "90-100%": 0,
  };

  const bucketKeys = Object.keys(buckets);

  // Iterate through the nested data structure to process each detection's confidence score.
  userCases.forEach((c) => {
    c.uploads.forEach((u) => {
      u.detections.forEach((d) => {
        const confidence = d.originalConfidence;
        if (confidence !== null) {
          // Normalize the confidence score to a 0-100 scale, accommodating both decimal (0-1) and percentage (0-100) formats.
          const percentage = confidence <= 1 ? confidence * 100 : confidence;

          // Calculate the correct bucket index based on the percentage.
          let bucketIndex = Math.floor(percentage / 10);
          // Handle the edge case of exactly 100% confidence to ensure it falls into the last bucket.
          if (bucketIndex >= 10) bucketIndex = 9;

          const key = bucketKeys[bucketIndex];
          if (key) {
            // Increment the count for the corresponding bucket.
            buckets[key]++;
          }
        }
      });
    });
  });

  // Transform the buckets object into the final array format required by the interface chart component.
  return bucketKeys.map((key) => ({
    name: key,
    count: buckets[key] as number,
  }));
};
