"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";

// Runtime check for required environment variables
if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_BUCKET_REGION) {
  throw new Error(
    "Missing required AWS environment variables: AWS_BUCKET_NAME or AWS_BUCKET_REGION"
  );
}
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const BUCKET_REGION = process.env.AWS_BUCKET_REGION;

/**
 * Zod schema for validating the input for saving an upload's metadata.
 */
const saveUploadSchema = z.object({
  id: z.string().cuid2("Invalid file ID."),
  key: z.string().min(1, "S3 key is required."),
  name: z.string().min(1, "File name is required."),
  type: z.string().min(1, "File type is required."),
  size: z.number().positive("File size must be positive."),
});

type SaveUploadInput = z.infer<typeof saveUploadSchema>;

/**
 * Defines the structured return type for the server action.
 */
type ActionResponse = {
  success: boolean;
  data?: {
    url: string;
  };
  error?: string;
};

/**
 * Saves a new upload's metadata to the database.
 * The client-generated CUID is used as the primary key to simplify state synchronization.
 *
 * @param values The metadata of the file to save.
 * @returns A promise that resolves to an object containing the generated S3 URL or an error.
 */
export async function saveUpload(values: SaveUploadInput): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    const parseResult = saveUploadSchema.safeParse(values);
    if (!parseResult.success) {
      return { success: false, error: "Invalid input provided." };
    }

    const { id, key, name, size, type } = parseResult.data;

    const url = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;

    await db.insert(uploads).values({
      id,
      key,
      name,
      url,
      size,
      type,
      userId,
    });

    return { success: true, data: { url } };
  } catch (error) {
    console.error("Error saving upload metadata:", error);
    return { success: false, error: "An internal server error occurred while saving the file." };
  }
}
