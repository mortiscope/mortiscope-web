"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { AccountDeletionRequestSchema } from "@/features/auth/schemas/auth";
import { sendAccountDeletionRequest } from "@/lib/mail";
import { generateAccountDeletionToken } from "@/lib/tokens";

/**
 * A server action to initiate the account deletion process.
 * @param values The form values, which may include a password for re-authentication.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const requestAccountDeletion = async (
  values: z.infer<typeof AccountDeletionRequestSchema>
) => {
  // Authenticate the user session to ensure they are logged in
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Unauthorized: You must be logged in to delete your account." };
  }

  // Fetch the full user record to check for pending deletions and password
  const user = await getUserByEmail(session.user.email);
  if (!user) {
    return { error: "User not found. Cannot proceed with deletion." };
  }

  // Prevent duplicate requests if a deletion is already scheduled
  if (user.deletionScheduledAt) {
    return { error: "This account is already scheduled for deletion." };
  }

  // For accounts with a password, require re-authentication
  if (user.password) {
    const validatedFields = AccountDeletionRequestSchema.safeParse(values);
    if (!validatedFields.success || !validatedFields.data.password) {
      return { error: "Password is required to delete this account." };
    }
    const { password } = validatedFields.data;

    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return { error: "Incorrect password." };
    }
  }

  // If all checks pass, generate and send a confirmation token via email
  try {
    const deletionToken = await generateAccountDeletionToken(user.email);
    await sendAccountDeletionRequest(user.email, deletionToken.token);
  } catch (error) {
    console.error("DELETION REQUEST FAILED:", error);
    return { error: "Something went wrong. Deletion email could not be sent." };
  }

  // Inform the user that a confirmation email has been sent
  return { success: "Confirmation required. Deletion link has been sent to your email." };
};
