import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Retrieves a user from the database by their email address.
 * @param email The user's email to search for.
 * @returns A promise that resolves to the user object or null if not found or a database error occurs.
 */
export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user || null;
  } catch (error) {
    console.error("DATABASE_ERROR (getUserByEmail):", error);
    return null;
  }
};

/**
 * Retrieves a user from the database by their unique ID.
 * @param id The user's unique identifier.
 * @returns A promise that resolves to the user object or null if not found or a database error occurs.
 */
export const getUserById = async (id: string) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user || null;
  } catch (error) {
    console.error("DATABASE_ERROR (getUserById):", error);
    return null;
  }
};
