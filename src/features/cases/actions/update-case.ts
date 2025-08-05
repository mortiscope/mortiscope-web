"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { caseAuditLogs, cases, type cases as CaseTable } from "@/db/schema";
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
 * A helper type for defining a change entry for the audit log.
 */
type ChangeEntry = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
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
    // Fetch the full existing case to compare all fields for auditing.
    const existingCase = await db.query.cases.findFirst({
      where: and(eq(cases.id, values.caseId), eq(cases.userId, userId)),
    });

    if (!existingCase) {
      return { success: false, error: "Case not found or access denied." };
    }

    // Audit Log Generation
    const changes: ChangeEntry[] = [];
    const checkChange = (
      field: keyof typeof CaseTable.$inferSelect,
      oldValue: unknown,
      newValue: unknown
    ) => {
      // Use JSON stringify for a more reliable comparison of objects like dates.
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field, oldValue, newValue });
      }
    };

    checkChange("caseName", existingCase.caseName, data.caseName);
    checkChange("temperatureCelsius", existingCase.temperatureCelsius, temperatureCelsius);
    checkChange("locationRegion", existingCase.locationRegion, data.location.region.name);
    checkChange("locationProvince", existingCase.locationProvince, data.location.province.name);
    checkChange("locationCity", existingCase.locationCity, data.location.city.name);
    checkChange("locationBarangay", existingCase.locationBarangay, data.location.barangay.name);
    checkChange("caseDate", existingCase.caseDate, data.caseDate);

    // Check if the temperature has changed for recalculation flag.
    const temperatureChanged = existingCase.temperatureCelsius !== temperatureCelsius;

    // Prepare the update object
    const updateData: Partial<typeof cases.$inferInsert> = {
      caseName: data.caseName,
      temperatureCelsius,
      locationRegion: data.location.region.name,
      locationProvince: data.location.province.name,
      locationCity: data.location.city.name,
      locationBarangay: data.location.barangay.name,
      caseDate: data.caseDate,
      notes: data.notes,
    };

    // Only update recalculationNeeded if temperature actually changed
    if (temperatureChanged) {
      updateData.recalculationNeeded = true;
    }

    // Execute the database update for the specified case.
    const result = await db
      .update(cases)
      .set(updateData)
      .where(and(eq(cases.id, values.caseId), eq(cases.userId, userId)));

    if (result.rowCount === 0) {
      return { success: false, error: "Case not found or you do not have permission to edit it." };
    }

    // If there were changes, insert them into the audit log.
    if (changes.length > 0) {
      const batchId = createId();
      await db.insert(caseAuditLogs).values(
        changes.map((change) => ({
          caseId: values.caseId,
          userId,
          batchId,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        }))
      );
    }

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
