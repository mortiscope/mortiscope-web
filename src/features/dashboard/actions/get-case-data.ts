"use server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import type { CaseData } from "@/features/dashboard/components/dashboard-table-columns";
import { formatConfidence, formatPmiToInterpretableString } from "@/lib/utils";

/**
 * A server action to fetch and transform all of a user's active cases into the
 * case data format required for the main dashboard table. It performs several
 * calculations and aggregations on the raw data.
 *
 * @returns A promise that resolves to an array of `CaseData` objects.
 * @throws An error if the user is not authenticated.
 */
export const getCaseData = async (): Promise<CaseData[]> => {
  // Authenticate the user's session. This action is only for authenticated users.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Fetch all active cases for the user from the database.
  const userCases = await db.query.cases.findMany({
    where: and(eq(cases.userId, session.user.id), eq(cases.status, "active")),
    orderBy: [desc(cases.caseDate)],
    with: {
      analysisResult: true,
      uploads: {
        with: {
          detections: {
            // Optimize by selecting only the necessary columns from the detections table.
            columns: {
              id: true,
              confidence: true,
              status: true,
            },
          },
        },
      },
    },
    // Optimize by selecting only the necessary columns from the cases table.
    columns: {
      caseName: true,
      caseDate: true,
      temperatureCelsius: true,
      locationRegion: true,
      locationProvince: true,
      locationCity: true,
      locationBarangay: true,
    },
  });

  // Filter and transform the raw database data into the case data format required by the interface table.
  return (
    userCases
      // Filter out any cases that have no detections at all.
      .filter((c) => c.uploads.some((u) => u.detections.length > 0))
      // Map over the remaining cases to perform calculations and formatting.
      .map((c) => {
        // Extract the analysis result for convenience.
        const ar = c.analysisResult;
        const totalMinutes = ar?.pmiMinutes ?? 0;

        // A map for converting raw stage names to human-readable labels.
        const stageMap: Record<string, string> = {
          instar_1: "First Instar",
          instar_2: "Second Instar",
          instar_3: "Third Instar",
          pupa: "Pupa",
          adult: "Adult",
        };

        // Process the oldest stage detected into a display-friendly format.
        const rawStage = ar?.oldestStageDetected;
        let displayStage = "No detections";
        if (rawStage) {
          if (rawStage in stageMap) {
            displayStage = stageMap[rawStage];
          } else {
            // Fallback for any stages not in the map.
            displayStage = rawStage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          }
        }

        // Flatten all detections from all uploads into a single array.
        const allDetections = c.uploads.flatMap((u) => u.detections);
        // Filter for only valid, non-null confidence scores.
        const validConfidences = allDetections
          .map((d) => d.confidence)
          .filter((val): val is number => typeof val === "number");

        // Calculate the average confidence.
        let avgConfidence = 0;
        if (validConfidences.length > 0) {
          const sum = validConfidences.reduce((acc, curr) => acc + curr, 0);
          avgConfidence = sum / validConfidences.length;
        }

        // Determine verification status
        const unverifiedCount = allDetections.filter((d) => d.status === "model_generated").length;
        const totalCount = allDetections.length;

        let verificationStatus = "no_detections";
        if (totalCount === 0) {
          verificationStatus = "no_detections";
        } else if (unverifiedCount === 0) {
          verificationStatus = "verified";
        } else if (unverifiedCount === totalCount) {
          verificationStatus = "unverified";
        } else {
          verificationStatus = "in_progress";
        }

        // Final object that matches the case data interface for the table.
        return {
          caseName: c.caseName,
          caseDate: c.caseDate.toISOString(),
          verificationStatus,
          pmiEstimation:
            totalMinutes > 0 ? formatPmiToInterpretableString(totalMinutes) : "No estimation",
          oldestStage: displayStage,
          averageConfidence: formatConfidence(validConfidences.length > 0 ? avgConfidence : null),
          imageCount: c.uploads.length,
          detectionCount: allDetections.length,
          location: {
            region: c.locationRegion,
            province: c.locationProvince,
            city: c.locationCity,
            barangay: c.locationBarangay,
          },
          temperature: c.temperatureCelsius ? `${c.temperatureCelsius} °C` : "N/A",
        };
      })
  );
};
