"use server";

import { getUserByEmail } from "@/data/user";
import { type ForgotPasswordFormValues, ForgotPasswordSchema } from "@/features/auth/schemas/auth";
import { sendForgotPassword } from "@/lib/mail";
import { emailActionLimiter } from "@/lib/rate-limiter";
import { generateForgotPasswordToken } from "@/lib/tokens";

/**
 * A server action to handle the "forgot password" process.
 * @param values The form values containing the user's email address.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const forgotPassword = async (values: ForgotPasswordFormValues) => {
  // Validate the form fields against the schema
  const validatedFields = ForgotPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid email address provided." };
  }

  const { email } = validatedFields.data;

  // Apply a rate limit based on the target email address to prevent spamming a user's inbox
  const { success } = await emailActionLimiter.limit(email);
  if (!success) {
    return { error: "Too many requests. Please wait a minute before retrying." };
  }

  try {
    // Check if a user with the provided email exists
    const existingUser = await getUserByEmail(email);

    // To prevent user enumeration, always return a success message
    if (!existingUser) {
      return {
        success: "A password reset link has been sent.",
      };
    }

    // If the user exists but has no password, they are an OAuth user.
    if (!existingUser.password) {
      return {
        success: "A password reset link has been sent.",
      };
    }

    // If the user exists and has a password, generate and send the password reset token
    const forgotPasswordToken = await generateForgotPasswordToken(email);
    await sendForgotPassword(forgotPasswordToken.identifier, forgotPasswordToken.token);

    return {
      success: "A password reset link has been sent.",
    };
  } catch (error) {
    // Handle any unexpected server errors
    console.error("FORGOT_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
