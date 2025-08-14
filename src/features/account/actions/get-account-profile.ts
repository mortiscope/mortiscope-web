"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * A server action to fetch the complete profile data for the currently authenticated user.
 * It verifies the user's session, queries the database for their profile information,
 * and returns a structured response object indicating success or failure.
 *
 * @returns A promise that resolves to a structured response object.
 */
export async function getAccountProfile() {
  try {
    // Get the current user's session to verify authentication.
    const session = await auth();

    // Ensure the user is authenticated by checking for a valid session and user ID.
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Not authenticated",
        data: null,
      };
    }

    // Fetch the user's profile data from the database, selecting only the necessary fields.
    const userProfile = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        professionalTitle: users.professionalTitle,
        institution: users.institution,
        locationRegion: users.locationRegion,
        locationProvince: users.locationProvince,
        locationCity: users.locationCity,
        locationBarangay: users.locationBarangay,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Handle the case where the user exists in the session but not in the database.
    if (!userProfile || userProfile.length === 0) {
      return {
        success: false,
        error: "User not found",
        data: null,
      };
    }

    // On success, return the fetched profile data.
    return {
      success: true,
      error: null,
      data: userProfile[0],
    };
  } catch (error) {
    // Catch any unexpected errors during the process and return a generic error message.
    console.error("Error fetching user profile:", error);
    return {
      success: false,
      error: "Failed to fetch profile data",
      data: null,
    };
  }
}
