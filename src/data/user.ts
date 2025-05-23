import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

// Retrieves a user from the database by their email
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

// Retrieves a user from the database by their unique ID
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
