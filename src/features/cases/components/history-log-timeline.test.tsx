import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { HistoryLogTimeline } from "@/features/cases/components/history-log-timeline";

// Mock the child component responsible for rendering a group of history events.
vi.mock("@/features/cases/components/history-log-timeline-event", () => ({
  HistoryLogTimelineEvent: ({ batchId, batchLogs }: { batchId: string; batchLogs: unknown[] }) => (
    <div data-testid="timeline-event" data-batch-id={batchId}>
      Event Count: {batchLogs.length}
    </div>
  ),
}));

// Define mock grouped data structure to simulate history logs organized by date and batch.
const mockGroupedData = {
  "2025-05-15": {
    "batch-1": [{ id: "1" }, { id: "2" }],
  },
  "2025-05-14": {
    "batch-2": [{ id: "3" }],
  },
  "2025-01-01": {
    "batch-3": [{ id: "4" }],
  },
} as unknown as React.ComponentProps<typeof HistoryLogTimeline>["groupedData"];

/**
 * Test suite for the `HistoryLogTimeline` component.
 */
describe("HistoryLogTimeline", () => {
  // Define a fixed system time for consistent "Today" and "Yesterday" calculations.
  const SYSTEM_TIME = new Date("2025-05-15T12:00:00Z");

  beforeEach(() => {
    // Arrange: Set up fake timers to control the current date.
    vi.useFakeTimers();
    vi.setSystemTime(SYSTEM_TIME);
  });

  afterEach(() => {
    // Arrange: Restore the real timers after each test.
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the dates are rendered with relative labels when applicable, and formatted dates otherwise.
   */
  it("renders the correct date headings", () => {
    // Arrange: Render the component with mock grouped data.
    render(<HistoryLogTimeline groupedData={mockGroupedData} />);

    // Assert: Check for the presence of the relative labels based on the mocked system time.
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();

    // Assert: Check for the presence of the fully formatted date for older entries.
    expect(screen.getByText(/January 1, 2025/)).toBeInTheDocument();
  });

  /**
   * Test case to verify that a `HistoryLogTimelineEvent` component is rendered for every unique batch found in the grouped data.
   */
  it("renders a timeline event for each batch in the data", () => {
    // Arrange: Render the component with mock grouped data (which contains three unique batches).
    render(<HistoryLogTimeline groupedData={mockGroupedData} />);

    // Assert: Check that exactly three timeline event components were rendered.
    const events = screen.getAllByTestId("timeline-event");
    expect(events).toHaveLength(3);
  });

  /**
   * Test case to verify that the correct `batchId` and `batchLogs` (count) are passed as props to the child timeline event component.
   */
  it("passes the correct props to the child component", () => {
    // Arrange: Render the component.
    render(<HistoryLogTimeline groupedData={mockGroupedData} />);

    // Assert: Locate the element corresponding to "batch-1".
    const batch1Element = screen
      .queryAllByTestId("timeline-event")
      .find((el) => el.getAttribute("data-batch-id") === "batch-1");

    // Assert: Verify the batch element is present.
    expect(batch1Element).toBeInTheDocument();
    // Assert: Check that the content reflects the correct number of logs (2) within that batch.
    expect(batch1Element).toHaveTextContent("Event Count: 2");
  });

  /**
   * Test case to verify that nothing is rendered if the `groupedData` prop is an empty object.
   */
  it("renders nothing if groupedData is empty", () => {
    // Arrange: Render the component with empty data.
    const { container } = render(<HistoryLogTimeline groupedData={{}} />);

    // Assert: Check that no timeline events or headings are rendered.
    expect(screen.queryByTestId("timeline-event")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    // Assert: Check that the root container element still has its base classes.
    expect(container.firstChild).toHaveClass("font-inter p-6 sm:p-8");
  });

  /**
   * Test case to verify that the visual timeline bars are rendered.
   */
  it("renders the visual timeline bar", () => {
    // Arrange: Render the component with mock grouped data.
    render(<HistoryLogTimeline groupedData={mockGroupedData} />);

    // Assert: Filter all generic elements to find those with the specific gradient class indicative of the timeline bar.
    const timelineBars = screen
      .getAllByRole("generic", { hidden: true })
      .filter((el) => el.classList.contains("bg-gradient-to-b"));

    // Assert: Expect at least one timeline bar element to be present.
    expect(timelineBars.length).toBeGreaterThan(0);
  });
});
