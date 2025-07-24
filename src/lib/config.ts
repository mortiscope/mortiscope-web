const serverConfig = {
  aws: {
    s3BucketName: process.env.AWS_BUCKET_NAME,
  },
};

// Perform a runtime validation to ensure all required variables are present.
if (!serverConfig.aws.s3BucketName) {
  throw new Error("Missing required server environment variable: AWS_BUCKET_NAME.");
}

// Export the validated server config object.
export const config = serverConfig;
