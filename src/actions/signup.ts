"use server";

import bcrypt from "bcryptjs";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmailVerification } from "@/lib/mail";
import { type SignUpFormValues, SignUpSchema } from "@/lib/schemas/auth";
import { generateVerificationToken } from "@/lib/tokens";

/**
 * A server action for handling new user registration.
 * @param values The form values containing the user's name, email, and password.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const signUp = async (values: SignUpFormValues) => {
  // Validate the form fields against the schema
  const validatedFields = SignUpSchema.safeParse(values);
  if (!validatedFields.success) {
    return {
      error: validatedFields.error.errors[0]?.message || "Invalid details.",
    };
  }

  const { firstName, lastName, email, password } = validatedFields.data;

  try {
    // Check if a user with the provided email already exists
    const existingUser = await getUserByEmail(email);

    // Handle cases where the email is already in the database
    if (existingUser) {
      // If the user has already verified, return an error
      if (existingUser.emailVerified) {
        return { error: "This email is already registered." };
      } else {
        // If the user exists but is not verified, re-send the verification email
        const verificationToken = await generateVerificationToken(email);
        await sendEmailVerification(verificationToken.identifier, verificationToken.token);
        return {
          success: "An account already exists with this email but not verified.",
        };
      }
    }

    // If the user is new, hash the password and create the user record
    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName}`;

    await db.insert(users).values({
      name: fullName,
      email: email,
      password: hashedPassword,
    });

    // Generate and send a verification token to the new user's email
    const verificationToken = await generateVerificationToken(email);
    await sendEmailVerification(verificationToken.identifier, verificationToken.token);

    return { success: "Email verification sent." };
  } catch (error) {
    // Handle any unexpected server errors
    console.error("SIGNUP_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred." };
  }
};
