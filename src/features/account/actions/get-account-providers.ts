"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Server action to get the current user's account providers information.
 * This determines if the user is using social providers for authentication.
 *
 * @returns A promise resolving to the providers data or an error message.
 */
export async function getAccountProviders() {
  try {
    // Get the current session to identify the user.
    const session = await auth();

    // Return an error if the user is not authenticated.
    if (!session?.user?.id) {
      return {
        success: false,
        error: "User not authenticated",
        data: null,
      };
    }

    // Fetch user data to check if they have a password
    const user = await db
      .select({
        password: schema.users.password,
      })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);

    if (!user.length) {
      return {
        success: false,
        error: "User not found",
        data: null,
      };
    }

    // Fetch linked accounts to check for social providers
    const accounts = await db
      .select({
        provider: schema.accounts.provider,
      })
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, session.user.id));

    const providers = accounts.map((account) => account.provider);
    const hasSocialProviders = providers.some(
      (provider) => provider !== "credentials" && provider !== undefined
    );
    const hasPassword = user[0].password !== null;

    return {
      success: true,
      data: {
        hasSocialProviders,
        providers,
        hasPassword,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching account providers:", error);
    return {
      success: false,
      error: "Failed to fetch account providers",
      data: null,
    };
  }
}
