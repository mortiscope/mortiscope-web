import { http, HttpResponse } from "msw";

import { mockSessions, mockTwoFactorAuth, mockUsers } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock account-related network requests.
 */
export const accountHandlers = [
  // Intercept GET requests to fetch the user profile data.
  http.get(`${API_URL}/api/account/profile`, () => {
    return HttpResponse.json({
      success: true,
      data: mockUsers.primaryUser,
    });
  }),

  // Intercept POST requests to update the user profile information.
  http.post(`${API_URL}/api/account/profile`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  }),

  // Intercept POST requests to update the user profile image.
  http.post(`${API_URL}/api/account/profile/image`, async () => {
    return HttpResponse.json({
      success: true,
      imageUrl: "/avatars/avatar-1.svg",
    });
  }),

  // Intercept GET requests to retrieve security settings like two-factor and password status.
  http.get(`${API_URL}/api/account/security`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        twoFactorEnabled: false,
        hasPassword: true,
        lastPasswordChange: "2025-01-01T00:00:00.000Z",
      },
    });
  }),

  // Intercept GET requests to identify which authentication providers are linked to the account.
  http.get(`${API_URL}/api/account/providers`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        google: false,
        microsoft: false,
        orcid: false,
        credentials: true,
      },
    });
  }),

  // Intercept POST requests to execute a password change operation.
  http.post(`${API_URL}/api/account/password`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  }),

  // Intercept POST requests to verify the current password before sensitive operations.
  http.post(`${API_URL}/api/account/password/verify`, async () => {
    return HttpResponse.json({
      success: true,
      verified: true,
    });
  }),

  // Intercept GET requests to list all active login sessions for the user.
  http.get(`${API_URL}/api/account/sessions`, () => {
    return HttpResponse.json({
      success: true,
      data: [mockSessions.currentSession, mockSessions.previousSession],
    });
  }),

  // Intercept GET requests to retrieve details for the specific current session.
  http.get(`${API_URL}/api/account/sessions/current`, () => {
    return HttpResponse.json({
      success: true,
      data: mockSessions.currentSession,
    });
  }),

  // Intercept DELETE requests to revoke a specific session using its `sessionId`.
  http.delete(`${API_URL}/api/account/sessions/:sessionId`, () => {
    return HttpResponse.json({
      success: true,
      message: "Session revoked",
    });
  }),

  // Intercept DELETE requests to revoke all active sessions for the user.
  http.delete(`${API_URL}/api/account/sessions`, () => {
    return HttpResponse.json({
      success: true,
      message: "All sessions revoked",
    });
  }),

  // Intercept POST requests to initiate two-factor authentication setup with a secret and QR code.
  http.post(`${API_URL}/api/account/two-factor/setup`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        secret: mockTwoFactorAuth.secret,
        qrCode: "data:image/png;base64,mock-qr-code",
      },
    });
  }),

  // Intercept POST requests to verify two-factor setup and return initial recovery codes.
  http.post(`${API_URL}/api/account/two-factor/verify`, async () => {
    return HttpResponse.json({
      success: true,
      recoveryCodes: mockTwoFactorAuth.recoveryCodes,
    });
  }),

  // Intercept POST requests to disable two-factor authentication for the account.
  http.post(`${API_URL}/api/account/two-factor/disable`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Two-factor authentication disabled",
    });
  }),

  // Intercept GET requests to check whether two-factor authentication is currently enabled.
  http.get(`${API_URL}/api/account/two-factor/status`, () => {
    return HttpResponse.json({
      success: true,
      data: { enabled: false },
    });
  }),

  // Intercept GET requests to retrieve existing two-factor recovery codes.
  http.get(`${API_URL}/api/account/two-factor/recovery-codes`, () => {
    return HttpResponse.json({
      success: true,
      data: mockTwoFactorAuth.recoveryCodes,
    });
  }),

  // Intercept POST requests to regenerate a new set of two-factor recovery codes.
  http.post(`${API_URL}/api/account/two-factor/recovery-codes`, () => {
    return HttpResponse.json({
      success: true,
      data: mockTwoFactorAuth.recoveryCodes,
    });
  }),

  // Intercept POST requests to initiate an email address change and trigger a verification email.
  http.post(`${API_URL}/api/account/email/change`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Verification email sent to new address",
    });
  }),

  // Intercept POST requests to finalize the email change via a verification token.
  http.post(`${API_URL}/api/account/email/verify`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Email changed successfully",
    });
  }),

  // Intercept POST requests to schedule the deletion of the user account.
  http.post(`${API_URL}/api/account/delete`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Account deletion scheduled",
      scheduledDeletionDate: "2025-01-15T00:00:00.000Z",
    });
  }),
];
