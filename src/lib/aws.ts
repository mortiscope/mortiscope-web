import { S3Client } from "@aws-sdk/client-s3";

// Read the environment variables
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Perform a runtime check
if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing required AWS environment variables for S3 Client!");
}

// Initialize the S3 client
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export { s3 };
