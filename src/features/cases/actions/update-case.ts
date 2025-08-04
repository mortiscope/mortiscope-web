"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { type CaseDetailsFormData, caseDetailsSchema } from "@/features/cases/schemas/case-details";
import { caseLogger, logError, logUserAction } from "@/lib/logger";

/**
 * Defines the structured return type for the server action for clarity and type safety.
 */
type ActionResponse = {
  success: boolean;
  error?: string;
  details?: z.ZodIssue[];
  recalculationTriggered?: boolean;
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
 * Validates and updates the details of an existing case in the database.
 * @param values An object containing the caseId to update and the new DetailsFormData.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function updateCase(values: {
  caseId: string;
  details: CaseDetailsFormData;
}): Promise<ActionResponse> {
  // Authenticate the user session.
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  // Perform server-side validation to ensure data integrity.
  const parseResult = caseDetailsSchema.safeParse(values.details);
  if (!parseResult.success) {
    return { success: false, error: "Invalid input.", details: parseResult.error.issues };
  }
  const data = parseResult.data;

  // Normalize temperature to Celsius for consistent storage.
  const temperatureCelsius =
    data.temperature.unit === "F"
      ? fahrenheitToCelsius(data.temperature.value)
      : data.temperature.value;

  // Additional runtime safety checks (should never fail after validation)
  if (!data.location.province || !data.location.city || !data.location.barangay) {
    return { success: false, error: "Missing required location information." };
  }

  try {
    // Fetch the existing case to compare the temperature.
    const existingCase = await db.query.cases.findFirst({
      where: and(eq(cases.id, values.caseId), eq(cases.userId, userId)),
      columns: { temperatureCelsius: true },
    });

    if (!existingCase) {
      return { success: false, error: "Case not found or access denied." };
    }

    // Check if the temperature has changed.
    const temperatureChanged = existingCase.temperatureCelsius !== temperatureCelsius;

    // Execute the database update for the specified case.
    const result = await db
      .update(cases)
      .set({
        caseName: data.caseName,
        temperatureCelsius,
        locationRegion: data.location.region.name,
        locationProvince: data.location.province.name,
        locationCity: data.location.city.name,
        locationBarangay: data.location.barangay.name,
        caseDate: data.caseDate,
        notes: data.notes,
        recalculationNeeded: temperatureChanged,
      })
      .where(and(eq(cases.id, values.caseId), eq(cases.userId, userId)));

    if (result.rowCount === 0) {
      return { success: false, error: "Case not found or you do not have permission to edit it." };
    }

    // On success, return a simple success message.
    logUserAction(caseLogger, "case_updated", userId, {
      caseId: values.caseId,
      caseName: data.caseName,
    });
    // Return the flag to the client.
    return { success: true, recalculationTriggered: temperatureChanged };
  } catch (error) {
    logError(caseLogger, "Error updating case", error, {
      userId,
      caseId: values.caseId,
      caseName: data.caseName,
    });
    // Specifically handle unique constraint violations for a user-friendly error.
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
    return { success: false, error: "An internal server error occurred while updating the case." };
  }
}
