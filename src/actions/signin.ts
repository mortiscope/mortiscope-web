"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";

import { signIn as authSignIn } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendAccountDeletionCancelled, sendEmailVerification } from "@/lib/mail";
import { type SignInFormValues, SignInSchema } from "@/lib/schemas/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

/**
 * A server action for handling credential-based user sign-in.
 * @param values The form values containing the user's email and password.
 * @returns A promise resolving to an object with an `error` message or performing a redirect on success.
 */
export const signIn = async (values: SignInFormValues) => {
  // Validate the form fields against the schema.
  const validatedFields = SignInSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid credentials provided." };
  }

  const { email, password } = validatedFields.data;

  // Retrieve user by email to perform pre-authentication checks.
  const existingUser = await getUserByEmail(email);

  // To prevent user enumeration, return a generic error if the user or password doesn't exist
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: "Invalid email or password." };
  }

  // Handle the account recovery case
  if (existingUser.deletionScheduledAt) {
    await db.update(users).set({ deletionScheduledAt: null }).where(eq(users.id, existingUser.id));

    console.log(
      `Account recovery for ${existingUser.email}. Scheduled deletion has been cancelled.`
    );

    // Send a notification email about the cancellation
    try {
      await sendAccountDeletionCancelled(existingUser.email, existingUser.name);
    } catch (emailError) {
      console.error(
        `Failed to send account deletion cancellation email to ${existingUser.email}, but the account was recovered successfully.`,
        emailError
      );
    }
  }

  // Handle unverified email case
  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(existingUser.email);
    await sendEmailVerification(verificationToken.identifier, verificationToken.token);
    return { error: "Please verify the email before signing in." };
  }

  try {
    // Attempt to sign the user in using the 'credentials' provider
    await authSignIn("credentials", {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    // Handle specific authentication errors from for better user feedback
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        case "OAuthAccountNotLinked":
          return { error: "This email is already linked with another service." };
        case "Verification":
          return { error: "Please verify the email before signing in." };
        case "EmailSignInError":
          return { error: "Failed to send the sign-in email." };
        case "OAuthCallbackError":
          return { error: "There was an error with social login provider." };
        case "WebAuthnVerificationError":
          return { error: "Failed to verify passkey." };
        default:
          return { error: "An unexpected error occurred." };
      }
    }

    // Rethrow any other unexpected errors.
    throw error;
  }
};
