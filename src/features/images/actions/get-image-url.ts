import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3 } from "@/lib/aws";
import { PRESIGNED_GET_EXPIRY_PROFILE } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Constructs a relative API endpoint URL for a given image ID.
 * This abstracts the actual API path and is used for images served by the application itself.
 *
 * @param imageId The unique identifier of the image.
 * @returns A string representing the local API path to the image.
 */
export function getImageUrl(imageId: string): string {
  return `/api/images/${imageId}`;
}

/**
 * A bulk version of `getImageUrl` that takes an array of image IDs and returns a
 * key-value map (or record) of image IDs to their corresponding local API endpoint URLs.
 *
 * @param imageIds An array of unique image identifiers.
 * @returns A record where each key is an image ID and its value is the API URL.
 */
export function getImageUrls(imageIds: string[]): Record<string, string> {
  // Uses `Object.fromEntries` to efficiently create an object from an array of key-value pairs.
  return Object.fromEntries(imageIds.map((id) => [id, `/api/images/${id}`]));
}

/**
 * Generates a temporary, secure, and publicly accessible URL (a "presigned URL") for a
 * profile image stored in Amazon S3. This function is intelligent enough to handle
 * different input formats.
 *
 * @param keyOrUrl The identifier for the image.
 * @returns A promise that resolves to a presigned S3 URL with a limited expiry time.
 */
export async function getProfileImageUrl(keyOrUrl: string | null): Promise<string | null> {
  // If no identifier is provided, return null immediately.
  if (!keyOrUrl) return null;

  let s3Key: string;

  if (!keyOrUrl.startsWith("http")) {
    // The input is not a URL, so assume it's a direct S3 key.
    s3Key = keyOrUrl;
  } else if (new URL(keyOrUrl).hostname.endsWith(".amazonaws.com")) {
    // The input is a full S3 URL. Extract the key from the pathname.
    s3Key = new URL(keyOrUrl).pathname.replace(/^\//, "");
  } else {
    // The input is a valid, non-S3 URL. Return it directly without generating a presigned URL.
    return keyOrUrl;
  }

  // Create the command to retrieve the object from the S3 bucket.
  const command = new GetObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: s3Key,
  });

  // Use the S3 request presigner to generate a temporary URL with a defined expiration time.
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_GET_EXPIRY_PROFILE });
}
