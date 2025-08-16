"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { fileTypeFromBlob } from "file-type";
import path from "path";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ProfileImageSchema } from "@/features/account/schemas/account";
import { s3 } from "@/lib/aws";
import { config } from "@/lib/config";
import { ACCEPTED_IMAGE_TYPES, PRESIGNED_URL_EXPIRATION_SECONDS } from "@/lib/constants";
import { privateActionLimiter } from "@/lib/rate-limiter";

type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: {
    url: string;
    key: string;
    publicUrl?: string;
  };
};

/**
 * Server action to handle profile image upload.
 * Generates a presigned S3 URL for the image upload.
 */
export async function generateProfileImageUploadUrl(formData: FormData): Promise<ActionResponse> {
  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  // Apply rate limiting
  const { success } = await privateActionLimiter.limit(session.user.id);
  if (!success) {
    return { error: "Too many upload attempts. Please try again shortly." };
  }

  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { error: "No file provided." };
    }

    // Validate the file using our schema
    const validation = ProfileImageSchema.safeParse({ file });
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid file." };
    }

    // Additional MIME type validation using file-type
    const fileType = await fileTypeFromBlob(file);
    if (!fileType || !Object.keys(ACCEPTED_IMAGE_TYPES).includes(fileType.mime)) {
      return { error: "Invalid or corrupted image file." };
    }

    // Generate unique key for the profile image
    const fileExtension = path.extname(file.name);
    const uniqueKey = `profile-images/${session.user.id}/${createId()}${fileExtension}`;

    // Create S3 command (rely on bucket policy for public access)
    const command = new PutObjectCommand({
      Bucket: config.aws.s3BucketName,
      Key: uniqueKey,
      ContentType: file.type,
      ContentLength: file.size,
    });

    // Generate presigned URL
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS,
    });

    // Construct the public URL on the server where we have access to config
    const publicUrl = `https://${config.aws.s3BucketName}.s3.${config.aws.bucketRegion}.amazonaws.com/${uniqueKey}`;

    return {
      success: true,
      data: {
        url: presignedUrl,
        key: uniqueKey,
        publicUrl: publicUrl,
      },
    };
  } catch (error) {
    return { error: "Failed to generate upload URL. Please try again." };
  }
}

/**
 * Server action to update the user's profile image URL in the database.
 */
export async function updateProfileImageUrl(imageUrl: string): Promise<ActionResponse> {
  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    // Update the user's image URL in the database
    await db
      .update(users)
      .set({
        image: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return { success: true };
  } catch (error) {
    return { error: "Failed to update profile image. Please try again." };
  }
}
