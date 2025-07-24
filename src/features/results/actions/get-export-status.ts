"use server";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { exports } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { config } from "@/lib/config";

/**
 * Fetches the status of a single export job by its ID.
 *
 * For a completed job, it generates a secure, short-lived S3 download URL.
 *
 * @param {string} exportId - The unique identifier of the export job to check.
 * @returns {Promise<{status: string; url?: string; failureReason?: string | null} | null>} The export status or null if not found.
 */
export const getExportStatus = async ({
  exportId,
}: {
  exportId: string;
}): Promise<{
  status: string;
  url?: string;
  failureReason?: string | null;
} | null> => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Find the specific export job, ensuring it belongs to the current user.
  const exportJob = await db.query.exports.findFirst({
    where: and(eq(exports.id, exportId), eq(exports.userId, session.user.id)),
    columns: {
      status: true,
      s3Key: true,
      failureReason: true,
    },
  });

  if (!exportJob) {
    return null;
  }

  // If the job is completed, generate the download URL.
  if (exportJob.status === "completed" && exportJob.s3Key) {
    const command = new GetObjectCommand({
      Bucket: config.aws.s3BucketName,
      Key: exportJob.s3Key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return { status: exportJob.status, url };
  }

  // Otherwise, just return the current status and reason.
  return { status: exportJob.status, failureReason: exportJob.failureReason };
};
