"use server";

import { and, eq, gte, lte } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * A server action to fetch and calculate a comprehensive set of dashboard metrics
 * for the currently authenticated user. It queries all of the user's active cases and
 * their related data, then aggregates this information into key performance indicators.
 *
 * @param startDate - Optional start date to filter cases by caseDate.
 * @param endDate - Optional end date to filter cases by caseDate.
 * @returns A promise that resolves to an object containing various dashboard metrics.
 * @throws An error if the user is not authenticated.
 */
export const getDashboardMetrics = async (startDate?: Date, endDate?: Date) => {
  // Authenticate the user's session.
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

  // Fetch all active cases for the user, along with their nested uploads, detections, and analysis results.
  const userCases = await db.query.cases.findMany({
    where: and(...whereConditions),
    with: {
      uploads: {
        columns: {},
        with: {
          detections: {
            columns: { status: true, confidence: true, label: true, originalLabel: true },
          },
        },
      },
      analysisResult: {
        columns: {
          pmiDays: true,
          pmiHours: true,
          pmiMinutes: true,
        },
      },
    },
  });

  // Initialize accumulator variables for all the metrics to be calculated.
  let verified = 0;
  let totalCases = 0;
  let totalImages = 0;
  let verifiedImages = 0;
  let totalDetectionsCount = 0;
  let verifiedDetectionsCount = 0;

  let totalPMIHours = 0;
  let pmiCount = 0;

  let totalConfidence = 0;
  let confidenceCount = 0;

  let totalDetections = 0;
  let correctedDetections = 0;

  // Iterate over each case to aggregate the metrics.
  userCases.forEach((c) => {
    // Case-Level Metrics
    const allDetections = c.uploads.flatMap((u) => u.detections);
    const hasDetections = allDetections.length > 0;
    const unverifiedCount = allDetections.filter((d) => d.status === "model_generated").length;

    // A case is only counted if it has at least one detection.
    if (hasDetections) {
      totalCases++;
      // A case is considered verified if none of its detections are in the initial model generated state.
      if (unverifiedCount === 0) {
        verified++;
      }
    }

    // Image and Detection-Level Metrics
    c.uploads.forEach((upload) => {
      const uploadDetections = upload.detections;
      // An image is only counted if it has at least one detection.
      if (uploadDetections.length > 0) {
        totalImages++;
        // An image is considered verified if all of its detections have been confirmed by the user.
        const allVerified = uploadDetections.every(
          (d) => d.status === "user_confirmed" || d.status === "user_edited_confirmed"
        );
        if (allVerified) {
          verifiedImages++;
        }

        // Aggregate total and verified detection counts across all images.
        totalDetectionsCount += uploadDetections.length;
        verifiedDetectionsCount += uploadDetections.filter(
          (d) => d.status === "user_confirmed" || d.status === "user_edited_confirmed"
        ).length;
      }
    });

    // Calculate the total PMI (in hours) across all cases that have a result.
    if (c.analysisResult && hasDetections) {
      const { pmiHours } = c.analysisResult;
      if (pmiHours != null) {
        totalPMIHours += pmiHours;
        pmiCount++;
      }
    }

    // Confidence and Correction Metrics
    if (hasDetections) {
      // First, calculate the average confidence for this specific case.
      const caseConfidences = allDetections
        .map((d) => d.confidence)
        .filter((conf): conf is number => conf != null);

      if (caseConfidences.length > 0) {
        const caseAverage =
          caseConfidences.reduce((sum, conf) => sum + conf, 0) / caseConfidences.length;
        // Then, add this case's average to the total confidence to be averaged later across all cases.
        totalConfidence += caseAverage;
        confidenceCount++;
      }
    }

    // Calculate the total number of detections that have been manually corrected or added by the user.
    totalDetections += allDetections.length;
    correctedDetections += allDetections.filter(
      (d) =>
        d.status === "user_created" ||
        ((d.status === "user_confirmed" || d.status === "user_edited_confirmed") &&
          d.label !== d.originalLabel)
    ).length;
  });

  // Calculate the final derived metrics.
  const averagePMI = pmiCount > 0 ? totalPMIHours / pmiCount : 0;
  const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  const correctionRate = totalDetections > 0 ? (correctedDetections / totalDetections) * 100 : 0;

  // Return the complete set of calculated metrics.
  return {
    verified,
    totalCases,
    totalImages,
    verifiedImages,
    totalDetectionsCount,
    verifiedDetectionsCount,
    averagePMI,
    averageConfidence,
    correctionRate,
  };
};
