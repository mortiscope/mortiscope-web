"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads } from "@/db/schema";
import { detailsSchema } from "@/features/analyze/schemas/details";

// Schema for the input of the submitUpload server action.
const submitUploadSchema = z.object({
  details: detailsSchema,
  uploadIds: z.array(z.string()).min(1, "At least one upload ID is required."),
});

/**
 * Defines the structured return type for the server action for clarity and type safety.
 */
type ActionResponse = {
  success: boolean;
  message: string;
  caseId?: number;
};

/**
 * Submits the final analysis, creating a case and linking the associated uploads.
 * It validates all incoming data and ensures the user is authenticated.
 *
 * @param values The input data containing case details and upload IDs.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function submitUpload(
  values: z.infer<typeof submitUploadSchema>
): Promise<ActionResponse> {
  try {
    // Authenticate the user session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized: You must be signed in to submit." };
    }
    const userId = session.user.id;

    // Validate the input parameters against the schema
    const parseResult = submitUploadSchema.safeParse(values);
    if (!parseResult.success) {
      return {
        success: false,
        message: "Invalid input: " + parseResult.error.flatten().formErrors.join(", "),
      };
    }

    const { details, uploadIds } = parseResult.data;

    // Server-side check to ensure temperature is in Celsius before database insertion.
    if (details.temperature.unit !== "C") {
      return {
        success: false,
        message: "Invalid temperature unit. Server expects temperature in Celsius.",
      };
    }

    // Insert the new case record into the database
    const newCase = await db
      .insert(cases)
      .values({
        userId,
        caseName: details.caseName,
        temperatureCelsius: details.temperature.value,
        locationRegion: details.location.region.name,
        locationProvince: details.location.province.name,
        locationCity: details.location.city.name,
        locationBarangay: details.location.barangay.name,
        caseDate: details.caseDate,
      })
      .returning({
        id: cases.id,
      });

    const caseId = newCase[0]?.id;

    if (!caseId) {
      throw new Error("Failed to create a new case record.");
    }

    // Associate the provided uploads with the new case by updating their 'caseId'
    await db
      .update(uploads)
      .set({ caseId: caseId })
      .where(and(eq(uploads.userId, userId), inArray(uploads.id, uploadIds)));

    return {
      success: true,
      message: "Upload submitted successfully!",
      caseId: caseId,
    };
  } catch (error) {
    console.error("Error submitting upload:", error);
    // Provide a generic error to the client to avoid leaking implementation details.
    return {
      success: false,
      message: "An internal server error occurred while submitting the upload.",
    };
  }
}
