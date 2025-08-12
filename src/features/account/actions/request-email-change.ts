"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AccountSecuritySchema } from "@/features/account/schemas/account";
import {
  type EmailChangeRequestFormValues,
  EmailChangeRequestSchema,
} from "@/features/auth/schemas/auth";
import { inngest } from "@/lib/inngest";
import { sendEmailChangeNotification, sendEmailChangeVerificationLink } from "@/lib/mail";
import { emailActionLimiter, privateActionLimiter } from "@/lib/rate-limiter";
import { generateEmailChangeToken } from "@/lib/tokens";

// Support both old and new form value types
type UpdateEmailValues = {
  email: string;
  currentPassword: string;
};

/**
 * A server action to handle email change requests.
 * Supports both verification flow and immediate update flow.
 * 
 * @param values The form values containing the new email and current password.
 * @param options Optional configuration for the email change behavior.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const requestEmailChange = async (
  values: EmailChangeRequestFormValues | UpdateEmailValues,
  options: { immediate?: boolean } = {}
) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "Unauthorized." };
  }

  // Apply a general rate limit for this authenticated action based on the user's ID
  const { success: privateLimitSuccess } = await privateActionLimiter.limit(session.user.id);
  if (!privateLimitSuccess) {
    return { error: "You are making too many requests. Please try again shortly." };
  }

  let newEmail: string;
  let currentPassword: string;

  // Handle both old and new form value types
  if ("email" in values) {
    // New format from account security form
    const validationResult = AccountSecuritySchema.pick({
      email: true,
    }).safeParse({ email: values.email });

    if (!validationResult.success) {
      return { error: "Invalid email provided." };
    }

    newEmail = validationResult.data.email;
    currentPassword = values.currentPassword;
  } else {
    // Legacy format from auth forms
    const validatedFields = EmailChangeRequestSchema.safeParse(values);
    if (!validatedFields.success) {
      return { error: "Invalid fields provided." };
    }

    newEmail = validatedFields.data.newEmail;
    currentPassword = validatedFields.data.currentPassword;
  }

  // Apply a stricter rate limit based on the target email address to prevent spamming
  const { success: emailLimitSuccess } = await emailActionLimiter.limit(newEmail);
  if (!emailLimitSuccess) {
    return { error: "A verification link for this email was requested recently. Please wait." };
  }

  // Fetch the full user record to perform password re-authentication
  const user = await getUserById(session.user.id);

  // Ensure this flow is only for users with a password
  if (!user || !user.password) {
    return { error: "Email cannot be changed for accounts without a password." };
  }

  // Re-authenticate the user by verifying their current password
  const passwordsMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordsMatch) {
    return { error: "Incorrect password. Please try again." };
  }

  // Perform business logic checks
  if (newEmail === user.email) {
    return { error: "New email must be different from the current one." };
  }

  // Check if the new email is already taken by another account
  const existingUserWithNewEmail = await getUserByEmail(newEmail);
  if (existingUserWithNewEmail) {
    return { error: "This email address is already in use." };
  }

  try {
    if (options.immediate) {
      // Immediate update flow (from account security form)
      await db
        .update(users)
        .set({
          email: newEmail,
          emailVerified: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Trigger Inngest event to send email change verification
      try {
        await inngest.send({
          name: "account/email.updated",
          data: {
            userId: user.id,
            oldEmail: user.email,
            newEmail: newEmail,
            userName: user.name,
          },
        });
      } catch (inngestError) {
        console.error("Failed to trigger email update event:", inngestError);
        // Fallback to direct email sending
        try {
          await sendEmailChangeNotification(newEmail, "new");
        } catch (emailError) {
          console.error("Failed to send email change notification:", emailError);
        }
      }

      return { success: "Email updated successfully. Please verify your new email address." };
    } else {
      // Verification flow
      const emailChangeToken = await generateEmailChangeToken(session.user.id, newEmail);

      // Send a verification link to the new email address to confirm ownership
      await sendEmailChangeVerificationLink(emailChangeToken.newEmail, emailChangeToken.token);

      // Send a security alert to the old email address to notify of the change attempt
      await sendEmailChangeNotification(user.email, "old");

      return { success: "Verification link sent to your new email address." };
    }
  } catch (error) {
    // Handle any unexpected server errors
    console.error("REQUEST_EMAIL_CHANGE_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred while processing your request." };
  }
};

// Export alias for backward compatibility with immediate update behavior
export const updateEmail = async (values: UpdateEmailValues) => {
  return requestEmailChange(values, { immediate: true });
};
