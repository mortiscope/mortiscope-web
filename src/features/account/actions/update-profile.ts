"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AccountProfileSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

type UpdateProfileValues = {
  name?: string;
  professionalTitle?: string;
  institution?: string;
  locationRegion?: string;
  locationProvince?: string;
  locationCity?: string;
  locationBarangay?: string;
};

/**
 * A server action to handle user profile updates.
 * Updates individual profile fields based on provided values.
 * 
 * @param values The form values containing the profile fields to update.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const updateProfile = async (values: UpdateProfileValues) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  // Apply a rate limit based on the user's ID to prevent rapid profile update attempts
  const { success } = await privateActionLimiter.limit(session.user.id);
  if (!success) {
    return {
      error: "You are attempting to update your profile too frequently. Please try again shortly.",
    };
  }

  const userId = session.user.id;

  try {
    // Retrieve the current user from the database
    const user = await getUserById(userId);
    if (!user) {
      return { error: "User not found." };
    }

    // Prepare update object with only provided fields
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Validate and add each field if provided
    if (values.name !== undefined) {
      const nameValidation = AccountProfileSchema.pick({ name: true }).safeParse({
        name: values.name,
      });
      if (!nameValidation.success) {
        return { error: "Invalid name provided." };
      }
      updateData.name = values.name;
    }

    if (values.professionalTitle !== undefined) {
      updateData.professionalTitle = values.professionalTitle || null;
    }

    if (values.institution !== undefined) {
      updateData.institution = values.institution || null;
    }

    // Handle location fields. All must be provided together or all set to null
    const locationFields = [
      values.locationRegion,
      values.locationProvince,
      values.locationCity,
      values.locationBarangay,
    ];

    const hasAnyLocationField = locationFields.some((field) => field !== undefined);

    if (hasAnyLocationField) {
      // If any location field is provided, validate that all required fields are present
      if (
        !values.locationRegion ||
        !values.locationProvince ||
        !values.locationCity ||
        !values.locationBarangay
      ) {
        return {
          error:
            "All location fields (region, province, city, barangay) must be provided together.",
        };
      }

      updateData.locationRegion = values.locationRegion;
      updateData.locationProvince = values.locationProvince;
      updateData.locationCity = values.locationCity;
      updateData.locationBarangay = values.locationBarangay;
    }

    // Check if there are any fields to update
    const fieldsToUpdate = Object.keys(updateData).filter((key) => key !== "updatedAt");
    if (fieldsToUpdate.length === 0) {
      return { error: "No fields provided for update." };
    }

    // Update the user record in the database
    await db.update(users).set(updateData).where(eq(users.id, userId));

    return { success: "Profile updated successfully." };
  } catch (error) {
    console.error("UPDATE_PROFILE_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
