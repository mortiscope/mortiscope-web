"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * A server action to fetch security-related data (specifically the email) for the
 * currently authenticated user. It verifies the user's session and returns their email
 * in a structured response object.
 *
 * @returns A promise that resolves to a structured response object.
 */
export async function getAccountSecurity() {
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

    // Fetch the user's security-related data (ID and email) from the database.
    const userSecurity = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Handle the edge case where the user exists in the session but not in the database.
    if (!userSecurity || userSecurity.length === 0) {
      return {
        success: false,
        error: "User not found",
        data: null,
      };
    }

    // On success, return the fetched security data.
    return {
      success: true,
      error: null,
      data: userSecurity[0],
    };
  } catch (error) {
    // Catch any unexpected errors during the process and return a generic error message.
    console.error("Error fetching user security data:", error);
    return {
      success: false,
      error: "Failed to fetch security data",
      data: null,
    };
  }
}
