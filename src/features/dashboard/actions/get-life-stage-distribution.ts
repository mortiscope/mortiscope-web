"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";

/**
 * A server action to fetch and calculate life stage distribution metrics
 * for the currently authenticated user. It queries all detections from the user's
 * active cases and aggregates them by life stage label.
 *
 * @returns A promise that resolves to an array of life stage counts ordered by canonical order.
 * @throws An error if the user is not authenticated.
 */
export const getLifeStageDistribution = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user, along with their uploads and detections.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    with: {
      uploads: {
        columns: {},
        with: {
          detections: {
            columns: { label: true },
            where: (detections, { isNull }) => isNull(detections.deletedAt),
          },
        },
      },
    },
  });

  // Initialize a map to count detections by life stage label.
  const lifeStageCount: Record<string, number> = {};

  // Iterate over each case and aggregate detection counts by label.
  userCases.forEach((c) => {
    c.uploads.forEach((upload) => {
      upload.detections.forEach((detection) => {
        const label = detection.label;
        lifeStageCount[label] = (lifeStageCount[label] || 0) + 1;
      });
    });
  });

  // Transform the aggregated data into an array format ordered by canonical life stage order.
  const orderedData = DETECTION_CLASS_ORDER.map((stage) => ({
    name: stage,
    quantity: lifeStageCount[stage] || 0,
  }));

  return orderedData;
};
