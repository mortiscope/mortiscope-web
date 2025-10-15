import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Constant containing mock user profile objects to simulate registered accounts in the system.
 */
export const mockUsers = {
  // Representation of the main user profile used for most authenticated test scenarios.
  primaryUser: {
    id: mockIds.firstUser,
    name: "MortiScope Account",
    email: "mortiscope@example.com",
    emailVerified: new Date(mockDates.created),
    image: null,
    professionalTitle: "Professional Title",
    institution: "Institution",
    createdAt: new Date(mockDates.created),
  },
  // Representation of an alternative user profile used to test data isolation and multi-user interactions.
  secondaryUser: {
    id: mockIds.secondUser,
    name: "MortiScope User",
    email: "mortiscope@test.com",
    emailVerified: new Date(mockDates.created),
    image: null,
    professionalTitle: "Professional Title",
    institution: "Institution",
    createdAt: new Date(mockDates.created),
  },
};
