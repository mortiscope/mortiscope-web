import { type Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getCaseData } from "@/features/dashboard/actions/get-case-data";

// Mock the authentication module to control session states during tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock environment variables to provide consistent configuration values.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  },
}));

// Mock the database client to intercept case queries and return controlled data.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Mock utility functions while preserving the original implementation for specific formatters.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatConfidence: actual.formatConfidence,
    formatPmiToInterpretableString: actual.formatPmiToInterpretableString,
  };
});

type AuthMock = () => Promise<Session | null>;

type CaseResult = Awaited<ReturnType<typeof db.query.cases.findMany>>;

/**
 * Test suite for the getCaseData server action.
 * This suite verifies the retrieval, filtering, and transformation of entomological case records for the dashboard.
 */
describe("getCaseData", () => {
  const mockUserId = "user-123";
  const mockDate = new Date("2025-10-15T10:00:00Z");

  // Define a standard case object to be used as a base for various test scenarios.
  const mockCaseBase = {
    id: "case-1",
    caseName: "Test Case",
    caseDate: mockDate,
    temperatureCelsius: 25.5,
    locationRegion: "Region 1",
    locationProvince: "Province 1",
    locationCity: "City 1",
    locationBarangay: "Barangay 1",
    analysisResult: {
      pmiMinutes: 1440,
      oldestStageDetected: "instar_3",
    },
    uploads: [
      {
        detections: [
          { id: "d1", confidence: 0.9, status: "model_generated" },
          { id: "d2", confidence: 0.8, status: "user_confirmed" },
        ],
      },
    ],
  };

  // Reset all mocks before each test to ensure a clean state and prevent cross-test interference.
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Restore the real timer implementation after each test.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the action throws an error when no user session is present.
   */
  it("throws error if user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

    // Assert: Verify that the function call results in an authentication error.
    await expect(getCaseData()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that database records are correctly mapped to the dashboard UI format.
   */
  it("fetches and transforms case data correctly", async () => {
    // Arrange: Mock a valid session and a database result containing one case.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([mockCaseBase] as unknown as CaseResult);

    // Act: Invoke the data fetching action.
    const result = await getCaseData();

    // Assert: Verify that the data fields are transformed correctly for the frontend.
    expect(result).toHaveLength(1);
    const caseData = result[0];

    expect(caseData.caseId).toBe("case-1");
    expect(caseData.caseName).toBe("Test Case");
    expect(caseData.caseDate).toBe(mockDate.toISOString());
    expect(caseData.pmiEstimation).toContain("1 day");
    expect(caseData.oldestStage).toBe("Third Instar");
    expect(caseData.averageConfidence).toBe("85.00%");
    expect(caseData.imageCount).toBe(1);
    expect(caseData.detectionCount).toBe(2);
    expect(caseData.temperature).toBe("25.5 °C");
    expect(caseData.location.city).toBe("City 1");

    expect(caseData.verificationStatus).toBe("in_progress");
  });

  /**
   * Test case to verify that cases without any biological detections are excluded from the results.
   */
  it("filters out cases with no detections", async () => {
    // Arrange: Setup a valid session.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    // Arrange: Create a mock case that has an empty detections array.
    const caseWithNoDetections = {
      ...mockCaseBase,
      id: "case-empty",
      uploads: [{ detections: [] }],
    };

    // Arrange: Return both a valid case and an empty case from the database mock.
    vi.mocked(db.query.cases.findMany).mockResolvedValue([
      mockCaseBase,
      caseWithNoDetections,
    ] as unknown as CaseResult);

    // Act: Fetch the filtered data.
    const result = await getCaseData();

    // Assert: Verify that only the case with detections is returned.
    expect(result).toHaveLength(1);
    expect(result[0].caseId).toBe("case-1");
  });

  /**
   * Test case to verify that date range parameters are correctly passed to the database query.
   */
  it("handles date filtering parameters", async () => {
    // Arrange: Setup a valid session and mock an empty return for the query.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Call the action with a specific date range.
    await getCaseData(startDate, endDate);

    // Assert: Verify that the database query was executed.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the formatter correctly handles biological stages not explicitly defined in the mapping.
   */
  it("formats unknown stages correctly", async () => {
    // Arrange: Setup a valid session and a case with an unrecognized stage ID.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const caseUnknownStage = {
      ...mockCaseBase,
      analysisResult: { ...mockCaseBase.analysisResult, oldestStageDetected: "unknown_stage_x" },
    };

    vi.mocked(db.query.cases.findMany).mockResolvedValue([
      caseUnknownStage,
    ] as unknown as CaseResult);

    // Act: Fetch the case data.
    const result = await getCaseData();

    // Assert: Verify that the raw stage ID is converted to a human-readable title case string.
    expect(result[0].oldestStage).toBe("Unknown Stage X");
  });

  /**
   * Test case to verify that the status is "verified" when all detections have been confirmed by a user.
   */
  it("calculates status: verified (all confirmed)", async () => {
    // Arrange: Mock a session and a case where the status for all detections is `user_confirmed`.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    const caseVerified = {
      ...mockCaseBase,
      uploads: [
        {
          detections: [{ id: "d1", confidence: 0.9, status: "user_confirmed" }],
        },
      ],
    };
    vi.mocked(db.query.cases.findMany).mockResolvedValue([caseVerified] as unknown as CaseResult);

    // Act: Fetch the case data.
    const result = await getCaseData();

    // Assert: Verify the verification status is set to `verified`.
    expect(result[0].verificationStatus).toBe("verified");
  });

  /**
   * Test case to verify that the status is "unverified" when no detections have been confirmed by a user.
   */
  it("calculates status: unverified (all unverified)", async () => {
    // Arrange: Mock a session and a case where the status for all detections is `model_generated`.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    const caseUnverified = {
      ...mockCaseBase,
      uploads: [
        {
          detections: [{ id: "d1", confidence: 0.9, status: "model_generated" }],
        },
      ],
    };
    vi.mocked(db.query.cases.findMany).mockResolvedValue([caseUnverified] as unknown as CaseResult);

    // Act: Fetch the case data.
    const result = await getCaseData();

    // Assert: Verify the verification status is set to `unverified`.
    expect(result[0].verificationStatus).toBe("unverified");
  });

  /**
   * Test case to verify that cases with missing analysis results display fallback text.
   */
  it("handles cases with no PMI estimation gracefully", async () => {
    // Arrange: Mock a session and a case where `analysisResult` is null.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    const caseNoPMI = {
      ...mockCaseBase,
      analysisResult: null,
    };
    vi.mocked(db.query.cases.findMany).mockResolvedValue([caseNoPMI] as unknown as CaseResult);

    // Act: Fetch the case data.
    const result = await getCaseData();

    // Assert: Verify fallback values are used for estimation and stage fields.
    expect(result[0].pmiEstimation).toBe("No estimation");
    expect(result[0].oldestStage).toBe("No detections");
  });

  /**
   * Test case to verify that null temperature or confidence values are handled without breaking the transformation.
   */
  it("handles missing optional values (temperature, confidence)", async () => {
    // Arrange: Setup session and a case with null optional fields.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const caseMissingValues = {
      ...mockCaseBase,
      temperatureCelsius: null,
      uploads: [
        {
          detections: [{ id: "d1", confidence: null, status: "model_generated" }],
        },
      ],
    };

    vi.mocked(db.query.cases.findMany).mockResolvedValue([
      caseMissingValues,
    ] as unknown as CaseResult);

    // Act: Fetch the case data.
    const result = await getCaseData();

    // Assert: Verify that "N/A" is returned for missing numerical data.
    expect(result[0].temperature).toBe("N/A");
    expect(result[0].averageConfidence).toBe("N/A");
  });
});
