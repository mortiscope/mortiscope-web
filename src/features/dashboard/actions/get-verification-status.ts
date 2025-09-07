"use server";

import { and, eq, gte, lte } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * A server action to fetch and calculate verification metrics for cases, images, and detections.
 * It queries all of the user's active cases and their related data, then aggregates verification status.
 *
 * @param startDate - Optional start date to filter cases by caseDate.
 * @param endDate - Optional end date to filter cases by caseDate.
 * @returns A promise that resolves to an object containing verification metrics.
 * @throws An error if the user is not authenticated.
 */
export const getVerificationStatus = async (startDate?: Date, endDate?: Date) => {
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
            columns: { status: true },
          },
        },
      },
    },
  });

  // Initialize counters to aggregate the results at each level.
  let caseVerified = 0;
  let caseUnverified = 0;
  let caseInProgress = 0;

  let imageVerified = 0;
  let imageUnverified = 0;
  let imageInProgress = 0;

  let detectionVerified = 0;
  let detectionUnverified = 0;

  // Iterate through each case to perform the multi-level aggregation.
  userCases.forEach((c) => {
    // First, flatten all detections within a case into a single array.
    const allDetections = c.uploads.flatMap((u) => u.detections);
    const hasDetections = allDetections.length > 0;

    if (hasDetections) {
      const verifiedCount = allDetections.filter(
        (d) => d.status === "user_confirmed" || d.status === "user_edited_confirmed"
      ).length;
      const unverifiedCount = allDetections.filter((d) => d.status === "model_generated").length;

      // Determine the overall status of the case based on its detections.
      if (verifiedCount === allDetections.length) {
        // A case is "verified" if all its detections are verified.
        caseVerified++;
      } else if (unverifiedCount === allDetections.length) {
        // A case is "unverified" if all its detections are unverified.
        caseUnverified++;
      } else {
        // A case is "in progress" if it has a mix of verified and unverified detections.
        caseInProgress++;
      }
    }

    // Then, iterate through each upload (image) within the case.
    c.uploads.forEach((upload) => {
      const uploadDetections = upload.detections;
      if (uploadDetections.length > 0) {
        const verifiedCount = uploadDetections.filter(
          (d) => d.status === "user_confirmed" || d.status === "user_edited_confirmed"
        ).length;
        const unverifiedCount = uploadDetections.filter(
          (d) => d.status === "model_generated"
        ).length;

        // Determine the overall status of the image based on its own detections.
        if (verifiedCount === uploadDetections.length) {
          imageVerified++;
        } else if (unverifiedCount === uploadDetections.length) {
          imageUnverified++;
        } else {
          imageInProgress++;
        }

        // Add the counts for this image to the total detection counts.
        detectionVerified += verifiedCount;
        detectionUnverified += unverifiedCount;
      }
    });
  });

  // Return the aggregated metrics in a structured object.
  return {
    caseVerification: {
      verified: caseVerified,
      unverified: caseUnverified,
      inProgress: caseInProgress,
    },
    imageVerification: {
      verified: imageVerified,
      unverified: imageUnverified,
      inProgress: imageInProgress,
    },
    detectionVerification: {
      verified: detectionVerified,
      unverified: detectionUnverified,
    },
  };
};
