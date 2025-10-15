import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";
import { mockLocations } from "@/__tests__/mocks/fixtures/locations.fixtures";

/**
 * Constant containing a collection of mock case objects used for testing data persistence and display.
 */
export const mockCases = {
  // Representation of a primary active case associated with the first test user.
  firstCase: {
    id: mockIds.firstCase,
    userId: mockIds.firstUser,
    caseName: "Case-001",
    status: "active" as const,
    temperatureCelsius: 28.5,
    ...mockLocations.firstLocation,
    caseDate: new Date(mockDates.caseDate),
    createdAt: new Date(mockDates.created),
    recalculationNeeded: false,
    notes: "Sample collected from outdoor location.",
  },
  // Representation of a secondary active case used to test list rendering and multi-case scenarios.
  secondCase: {
    id: mockIds.secondCase,
    userId: mockIds.firstUser,
    caseName: "Case-002",
    status: "active" as const,
    temperatureCelsius: 32.0,
    ...mockLocations.secondLocation,
    caseDate: new Date(mockDates.caseDate),
    createdAt: new Date(mockDates.created),
    recalculationNeeded: false,
    notes: "",
  },
  // Representation of a case in draft status associated with a different user to test access control.
  thirdCase: {
    id: mockIds.thirdCase,
    userId: mockIds.secondUser,
    caseName: "Case-003",
    status: "draft" as const,
    temperatureCelsius: 25.0,
    ...mockLocations.firstLocation,
    caseDate: new Date(mockDates.caseDate),
    createdAt: new Date(mockDates.created),
    recalculationNeeded: false,
    notes: "Pending analysis.",
  },
};
