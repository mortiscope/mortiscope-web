import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { CaseHistoryLog } from "@/features/cases/components/case-history-log";
import { useFormattedHistory } from "@/features/cases/hooks/use-formatted-history";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Mock the custom hook `useFormattedHistory` to control the data processing result.
vi.mock("@/features/cases/hooks/use-formatted-history", () => ({
  useFormattedHistory: vi.fn(),
}));

// Mock the state components (Loading, Error, Empty) to isolate their rendering logic.
vi.mock("@/features/cases/components/history-log-empty-state", () => ({
  HistoryLogLoadingState: () => <div data-testid="loading-state">Loading...</div>,
  HistoryLogErrorState: () => <div data-testid="error-state">Error</div>,
  HistoryLogEmptyState: () => <div data-testid="empty-state">Empty</div>,
}));

// Mock the `HistoryLogTimeline` component to verify that it receives the correctly formatted data.
vi.mock("@/features/cases/components/history-log-timeline", () => ({
  HistoryLogTimeline: ({ groupedData }: { groupedData: unknown }) => (
    <div data-testid="timeline">
      Timeline Rendered
      <span data-testid="grouped-data-json">{JSON.stringify(groupedData)}</span>
    </div>
  ),
}));

// Mock the `TooltipProvider` to simplify the testing environment.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Type definition aliases for clarity on mocked data structures.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
type GroupedHistory = ReturnType<typeof useFormattedHistory>;

/**
 * Test suite for the `CaseHistoryLog` component.
 */
describe("CaseHistoryLog", () => {
  beforeEach(() => {
    // Reset all mock function calls before each test execution.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the loading state component is rendered when `isLoading` is true.
   */
  it("renders the loading state when isLoading is true", () => {
    // Arrange: Render the component with `isLoading` set to true.
    render(<CaseHistoryLog isLoading={true} isError={false} data={undefined} />);

    // Assert: Check for the presence of the mock loading state and the absence of the timeline.
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the error state component is rendered when `isError` is true.
   */
  it("renders the error state when isError is true", () => {
    // Arrange: Render the component with `isError` set to true.
    render(<CaseHistoryLog isLoading={false} isError={true} data={[]} />);

    // Assert: Check for the presence of the mock error state and the absence of the loading state.
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the empty state component is rendered when `data` is undefined.
   */
  it("renders the empty state when data is undefined", () => {
    // Arrange: Render the component with `data` set to undefined.
    render(<CaseHistoryLog isLoading={false} isError={false} data={undefined} />);

    // Assert: Check for the presence of the mock empty state.
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the empty state component is rendered when `data` is an empty array.
   */
  it("renders the empty state when data is an empty array", () => {
    // Arrange: Render the component with `data` set to an empty array.
    render(<CaseHistoryLog isLoading={false} isError={false} data={[]} />);

    // Assert: Check for the presence of the mock empty state.
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the timeline component renders when valid data is present, utilizing the `useFormattedHistory` hook.
   */
  it("renders the timeline with formatted data when data is present", () => {
    // Arrange: Define mock raw data and the expected formatted data output.
    const mockRawData = [{ id: "1", action: "UPDATE" }] as unknown as CaseHistoryData;
    const mockFormattedData = {
      Today: [{ id: "1", action: "UPDATE" }],
    } as unknown as GroupedHistory;

    // Arrange: Mock the custom hook to return the formatted data.
    vi.mocked(useFormattedHistory).mockReturnValue(mockFormattedData);

    // Arrange: Render the component with the mock raw data.
    render(<CaseHistoryLog isLoading={false} isError={false} data={mockRawData} />);

    // Assert: Check that the mock timeline component is rendered.
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    // Assert: Check that the formatting hook was called correctly with the raw data.
    expect(useFormattedHistory).toHaveBeenCalledWith(mockRawData);

    // Assert: Check that the timeline component received the correctly formatted data as a prop.
    expect(screen.getByTestId("grouped-data-json")).toHaveTextContent(
      JSON.stringify(mockFormattedData)
    );
  });
});
