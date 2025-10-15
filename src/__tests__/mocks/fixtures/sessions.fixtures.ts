import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Constant containing mock session objects used to simulate user authentication states.
 */
export const mockSessions = {
  // Representation of the active authentication session for the primary test user.
  currentSession: {
    id: mockIds.firstSession,
    userId: mockIds.firstUser,
    sessionToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJxOXhtcG5jMWxsdWM3cmFmd3RpZmcybXAifQ.kR5gT2mN8pL1xQ9vW3yH6jK4bF7cA0nE",
    expires: new Date("2025-02-01T00:00:00.000Z"),
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    ipAddress: "192.168.1.1",
    lastActivity: new Date(mockDates.updated),
    isCurrent: true,
  },
  // Representation of an expired or secondary session used to test session revocation and history views.
  previousSession: {
    id: mockIds.secondSession,
    userId: mockIds.firstUser,
    sessionToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJrOHdtcW5kMm1tdmQ4c2JodWpob2dmbnEifQ.mS6hU3oO9qM2yR0wX4zI7kL5cG8dB1oF",
    expires: new Date("2025-01-15T00:00:00.000Z"),
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17)",
    ipAddress: "10.0.0.1",
    lastActivity: new Date(mockDates.created),
    isCurrent: false,
  },
};
