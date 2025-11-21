import { S3Client } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

/**
 * A private, module-level variable to cache the singleton S3 client instance.
 */
let _s3: S3Client | undefined;

/**
 * A lazy initializer function for the S3 client.
 * @returns The singleton `S3Client` instance.
 */
function getS3(): S3Client {
  return (_s3 ??= new S3Client({
    region: env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  }));
}

/**
 * The exported singleton S3 client instance for the application.
 */
export const s3: S3Client = new Proxy({} as S3Client, {
  get(_, prop) {
    // Ensure the singleton instance is created and available.
    const target = getS3();
    // Retrieve the requested property (e.g., the 'send' method) from the actual client instance.
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    // If the retrieved property is a function, bind `this` to the actual client instance before returning it.
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});
