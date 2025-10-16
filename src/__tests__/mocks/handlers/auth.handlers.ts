import { http, HttpResponse } from "msw";

import { mockAuthCredentials, mockUsers } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock authentication-related network requests.
 */
export const authHandlers = [
  // Intercept POST requests to the sign-in endpoint to authenticate users via credentials.
  http.post(`${API_URL}/api/auth/signin`, async ({ request }) => {
    // Extract the email and password from the request body.
    const body = (await request.json()) as { email: string; password: string };

    // Validate the provided credentials against the mock valid user data.
    if (
      body.email === mockAuthCredentials.validUser.email &&
      body.password === mockAuthCredentials.validUser.password
    ) {
      return HttpResponse.json({
        success: true,
        user: mockUsers.primaryUser,
      });
    }

    // Return a 401 Unauthorized response if the credentials do not match.
    return HttpResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }),

  // Intercept POST requests to the sign-up endpoint to handle new user registration.
  http.post(`${API_URL}/api/auth/signup`, async ({ request }) => {
    // Extract the registration details from the request body.
    const body = (await request.json()) as { email: string; password: string; name: string };

    // Simulate a conflict error if the provided email is already in use by the mock user.
    if (body.email === mockAuthCredentials.validUser.email) {
      return HttpResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    // Return a success response indicating that the verification process has started.
    return HttpResponse.json({
      success: true,
      message: "Verification email sent",
    });
  }),

  // Intercept POST requests to the forgot-password endpoint to mock reset email triggers.
  http.post(`${API_URL}/api/auth/forgot-password`, async () => {
    return HttpResponse.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  }),

  // Intercept POST requests to the reset-password endpoint to mock password updates.
  http.post(`${API_URL}/api/auth/reset-password`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  }),

  // Intercept POST requests to the verify endpoint to mock email verification completion.
  http.post(`${API_URL}/api/auth/verify`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Email verified successfully.",
    });
  }),

  // Intercept POST requests to the two-factor endpoint to validate 2FA tokens.
  http.post(`${API_URL}/api/auth/two-factor`, async ({ request }) => {
    // Extract the 2FA token from the request body.
    const body = (await request.json()) as { token: string };

    // Validate if the token matches the specific mock numeric code `123456`.
    if (body.token === "123456") {
      return HttpResponse.json({
        success: true,
        user: mockUsers.primaryUser,
      });
    }

    // Return a 401 Unauthorized response for incorrect 2FA tokens.
    return HttpResponse.json({ success: false, error: "Invalid 2FA token" }, { status: 401 });
  }),

  // Intercept POST requests to the recovery endpoint to validate backup recovery codes.
  http.post(`${API_URL}/api/auth/recovery`, async ({ request }) => {
    // Extract the recovery code from the request body.
    const body = (await request.json()) as { code: string };

    // Verify if the recovery code matches the expected alphanumeric pattern.
    if (body.code.match(/^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/)) {
      return HttpResponse.json({
        success: true,
        user: mockUsers.primaryUser,
      });
    }

    // Return a 401 Unauthorized response for malformed or incorrect recovery codes.
    return HttpResponse.json({ success: false, error: "Invalid recovery code" }, { status: 401 });
  }),
];
