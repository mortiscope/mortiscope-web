"use server";

import { and, eq, isNotNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";

/**
 * A server action to fetch and calculate model performance metrics
 * for the currently authenticated user. It queries all detections with
 * original confidence scores and calculates the average confidence per life stage.
 *
 * @returns A promise that resolves to an array of model performance data ordered by life stage.
 * @throws An error if the user is not authenticated.
 */
export const getModelPerformanceMetrics = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user with their uploads and detections.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    with: {
      uploads: {
        columns: {},
        with: {
          detections: {
            columns: {
              originalLabel: true,
              originalConfidence: true,
            },
            where: (detections, { isNull, and }) =>
              and(isNull(detections.deletedAt), isNotNull(detections.originalConfidence)),
          },
        },
      },
    },
  });

  // Initialize a map to accumulate confidence scores by life stage.
  const stageConfidence: Record<string, { total: number; count: number }> = {};

  // Iterate over each case and aggregate confidence scores by original label.
  userCases.forEach((c) => {
    c.uploads.forEach((upload) => {
      upload.detections.forEach((detection) => {
        const label = detection.originalLabel;
        const confidence = detection.originalConfidence;

        if (confidence !== null) {
          if (!stageConfidence[label]) {
            stageConfidence[label] = { total: 0, count: 0 };
          }
          stageConfidence[label].total += confidence;
          stageConfidence[label].count += 1;
        }
      });
    });
  });

  // Calculate average confidence and convert to percentage for each stage.
  const orderedData = DETECTION_CLASS_ORDER.map((stage) => {
    const data = stageConfidence[stage];
    const averageConfidence = data ? (data.total / data.count) * 100 : 0;

    return {
      name: stage,
      confidence: Math.round(averageConfidence * 10) / 10,
    };
  });

  return orderedData;
};
