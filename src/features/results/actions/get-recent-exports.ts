"use server";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { subMinutes } from "date-fns";
import { and, eq, gte, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { exports } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { config } from "@/lib/config";

/**
 * Fetches recent export jobs for the current user that are either pending, processing, or have just completed.
 *
 * For completed jobs, it generates a secure, short-lived S3 download URL.
 *
 * @returns {Promise<Array<{id: string; status: string; url?: string; failureReason?: string | null}>>} A list of recent exports.
 */
export const getRecentExports = async (): Promise<
  Array<{ id: string; status: string; url?: string; failureReason?: string | null }>
> => {
  const session = await auth();

  if (!session?.user?.id) {
    // Return an empty array if the user is not authenticated.
    return [];
  }

  // Find all exports for the current user created in the last 10 minutes that are not yet marked as 'failed' or have already been handled.
  const recentExports = await db.query.exports.findMany({
    where: and(
      eq(exports.userId, session.user.id),
      inArray(exports.status, ["pending", "processing", "completed"]),
      gte(exports.createdAt, subMinutes(new Date(), 10))
    ),
    columns: {
      id: true,
      status: true,
      s3Key: true,
      failureReason: true,
    },
  });

  if (recentExports.length === 0) {
    return [];
  }

  // Process completed exports to generate download URLs.
  const processedExports = await Promise.all(
    recentExports.map(async (exp) => {
      if (exp.status === "completed" && exp.s3Key) {
        const command = new GetObjectCommand({
          Bucket: config.aws.s3BucketName,
          Key: exp.s3Key,
        });
        // Generate a pre-signed URL that is valid for 1 minute for security.
        const url = await getSignedUrl(s3, command, { expiresIn: 60 });
        return {
          id: exp.id,
          status: exp.status,
          url,
        };
      }
      return {
        id: exp.id,
        status: exp.status,
        failureReason: exp.failureReason,
      };
    })
  );

  return processedExports;
};
