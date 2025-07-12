"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { type DetailsFormData, detailsSchema } from "@/features/analyze/schemas/details";

/**
 * Defines the structured return type for the server action for clarity and type safety.
 */
type ActionResponse = {
  success: boolean;
  data?: {
    caseId: string;
  };
  error?: string;
  details?: z.ZodIssue[];
};

/**
 * Converts a temperature from Fahrenheit to Celsius.
 * @param fahrenheit - The temperature value in Fahrenheit.
 * @returns The equivalent temperature in Celsius.
 */
function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Validates the provided details and creates a new case entry in the database.
 * This action is the first step in the analysis workflow.
 *
 * @param values The input data containing case details, matching the DetailsFormData type.
 * @returns A promise that resolves to an object containing the new case ID upon success, or an error message on failure.
 */
export async function createCase(values: DetailsFormData): Promise<ActionResponse> {
  // Authenticate the user session.
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  // Perform server-side validation to ensure data integrity.
  const parseResult = detailsSchema.safeParse(values);
  if (!parseResult.success) {
    return { success: false, error: "Invalid input.", details: parseResult.error.issues };
  }
  const data = parseResult.data;

  // Normalize temperature to Celsius for consistent storage.
  const temperatureCelsius =
    data.temperature.unit === "F"
      ? fahrenheitToCelsius(data.temperature.value)
      : data.temperature.value;

  try {
    // Execute the database insertion.
    const [newCase] = await db
      .insert(cases)
      .values({
        userId,
        caseName: data.caseName,
        temperatureCelsius,
        locationRegion: data.location.region.name,
        locationProvince: data.location.province.name,
        locationCity: data.location.city.name,
        locationBarangay: data.location.barangay.name,
        caseDate: data.caseDate,
      })
      .returning({ id: cases.id });

    if (!newCase?.id) {
      throw new Error("Database failed to return the new case ID.");
    }

    // On success, return the newly created case ID.
    return { success: true, data: { caseId: newCase.id } };
  } catch (error) {
    console.error("Error creating case:", error);

    if (
      error &&
      typeof error === "object" &&
      "cause" in error &&
      error.cause &&
      typeof error.cause === "object" &&
      "code" in error.cause &&
      error.cause.code === "23505"
    ) {
      return { success: false, error: "A case with this name already exists." };
    }

    // Fallback for all other unexpected errors.
    return { success: false, error: "An internal server error occurred while creating the case." };
  }
}
