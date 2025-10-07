import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardContainer } from "@/features/dashboard/components/dashboard-container";
import { CaseData } from "@/features/dashboard/schemas/dashboard";

// Mock the server action to prevent database access and control metrics data.
vi.mock("@/features/dashboard/actions/get-dashboard-metrics", () => ({
  getDashboardMetrics: vi.fn(),
}));

// Mock the presentational DashboardView component to verify prop drilling and calculations.
vi.mock("@/features/dashboard/components/dashboard-view", () => ({
  DashboardView: ({
    firstName,
    oldestCaseDate,
    caseData,
  }: Record<string, unknown> & { caseData: CaseData[] }) => (
    <div data-testid="mock-dashboard-view">
      <span data-testid="view-firstname">{firstName as React.ReactNode}</span>
      <span data-testid="view-oldest-date">{oldestCaseDate as React.ReactNode}</span>
      <span data-testid="view-case-count">{caseData.length}</span>
    </div>
  ),
}));

/**
 * Test suite for the `DashboardContainer` component.
 */
describe("DashboardContainer", () => {
  const mockMetrics = {
    verified: 5,
    totalCases: 10,
    totalImages: 20,
    verifiedImages: 10,
    totalDetectionsCount: 50,
    verifiedDetectionsCount: 25,
    averagePMI: 24,
    averageConfidence: 0.85,
    correctionRate: 10,
  };

  const mockCaseData: CaseData[] = [
    {
      caseId: "1",
      caseName: "Recent Case",
      caseDate: "2025-01-15T10:00:00Z",
      verificationStatus: "verified",
      pmiEstimation: "24 hours",
      oldestStage: "Adult",
      averageConfidence: "0.95",
      imageCount: 5,
      detectionCount: 10,
      temperature: "25",
      location: {
        region: "Region 1",
        province: "Province 1",
        city: "City 1",
        barangay: "Barangay 1",
      },
    },
    {
      caseId: "2",
      caseName: "Oldest Case",
      caseDate: "2025-01-01T10:00:00Z",
      verificationStatus: "verified",
      pmiEstimation: "24 hours",
      oldestStage: "Adult",
      averageConfidence: "0.95",
      imageCount: 5,
      detectionCount: 10,
      temperature: "24",
      location: {
        region: "Region 2",
        province: "Province 2",
        city: "City 2",
        barangay: "Barangay 2",
      },
    },
  ];

  /**
   * Test case to verify that metrics are fetched and the earliest date is correctly extracted from `caseData`.
   */
  it("fetches metrics and passes calculated oldest date to view", async () => {
    // Arrange: Mock the metrics server action to return the predefined `mockMetrics`.
    vi.mocked(getDashboardMetrics).mockResolvedValue(mockMetrics);

    // Act: Invoke the container as a server component.
    const ui = await DashboardContainer({
      firstName: "John",
      caseData: mockCaseData,
    });

    render(ui);

    // Assert: Verify that the data fetching action was triggered.
    expect(getDashboardMetrics).toHaveBeenCalledTimes(1);

    // Assert: Check that the name and case count are drilled down correctly.
    expect(screen.getByTestId("mock-dashboard-view")).toBeInTheDocument();
    expect(screen.getByTestId("view-firstname")).toHaveTextContent("John");

    // Assert: Verify the logic correctly identified the earliest timestamp in the array.
    expect(screen.getByTestId("view-oldest-date")).toHaveTextContent("2025-01-01T10:00:00Z");
    expect(screen.getByTestId("view-case-count")).toHaveTextContent("2");
  });

  /**
   * Test case to verify that the container handles an empty `caseData` array without crashing.
   */
  it("handles empty case data gracefully (undefined oldest date)", async () => {
    // Arrange: Mock the metrics server action.
    vi.mocked(getDashboardMetrics).mockResolvedValue(mockMetrics);

    // Act: Invoke the container with an empty array for the `caseData` prop.
    const ui = await DashboardContainer({
      firstName: "Watson",
      caseData: [],
    });

    render(ui);

    // Assert: Verify that the view renders with fallback or empty values for the date.
    expect(screen.getByTestId("view-firstname")).toHaveTextContent("Watson");
    expect(screen.getByTestId("view-case-count")).toHaveTextContent("0");
    expect(screen.getByTestId("view-oldest-date")).toBeEmptyDOMElement();
  });
});
