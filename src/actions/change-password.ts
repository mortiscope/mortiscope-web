"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendPasswordUpdatedEmail } from "@/lib/mail";
import { type ChangePasswordFormValues, ChangePasswordSchema } from "@/lib/schemas/auth";

/**
 * A server action to handle user password changes.
 * @param values The form values containing the current and new passwords.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const changePassword = async (values: ChangePasswordFormValues) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  // Validate the form fields against the schema
  const validatedFields = ChangePasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { currentPassword, newPassword } = validatedFields.data;
  const userId = session.user.id;

  try {
    // Retrieve the current user from the database
    const user = await getUserById(userId);
    if (!user || !user.password) {
      return { error: "An unexpected error occurred." };
    }

    // Verify that the provided current password is correct
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return { error: "Incorrect current password." };
    }

    // Hash the new password and update the user record in the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send a notification email about the password change
    try {
      await sendPasswordUpdatedEmail(user.email);
    } catch (error) {
      console.error("Failed to send password updated email after change:", error);
    }

    return { success: "Password updated successfully." };
  } catch (error) {
    console.error("CHANGE_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
