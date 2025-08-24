"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { logError, uploadLogger } from "@/lib/logger";

// Define the schema for the data required to save an upload record.
const saveUploadSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  width: z.number(),
  height: z.number(),
  caseId: z.string().min(1, { message: "Case ID is required to save the upload." }),
});

type SaveUploadInput = z.infer<typeof saveUploadSchema>;

type ActionResponse = {
  success: boolean;
  data?: {
    url: string;
  };
  error?: string;
};

// Runtime checks for environment variables
if (!process.env.AWS_BUCKET_NAME) {
  throw new Error("Missing required AWS environment variable: AWS_BUCKET_NAME");
}
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

if (!process.env.AWS_BUCKET_REGION) {
  throw new Error("Missing required AWS environment variable: AWS_BUCKET_REGION");
}
const BUCKET_REGION = process.env.AWS_BUCKET_REGION;

/**
 * Saves the metadata of a successfully uploaded file to the database.
 * This action creates a permanent record in the `uploads` table, linking the file to a user and a case.
 *
 * @param values - The validated metadata of the uploaded file.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function saveUpload(values: SaveUploadInput): Promise<ActionResponse> {
  // Authenticate the user session.
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  // Validate the input on the server.
  const parseResult = saveUploadSchema.safeParse(values);
  if (!parseResult.success) {
    return { success: false, error: "Invalid input provided for saving upload." };
  }

  const { id, key, name, size, type, width, height, caseId } = parseResult.data;
  const url = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;

  try {
    await db.insert(uploads).values({
      id,
      key,
      name,
      url,
      size,
      type,
      width,
      height,
      userId,
      caseId,
    });

    return { success: true, data: { url } };
  } catch (error) {
    logError(uploadLogger, "Error saving upload metadata", error, {
      userId,
      uploadId: id,
      key,
      caseId,
    });
    return { success: false, error: "Failed to save upload details to the database." };
  }
}
