import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { HistoryLogTimelineEvent } from "@/features/cases/components/history-log-timeline-event";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Define type aliases for clarity based on the expected data structures.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
type LogEntry = CaseHistoryData[number];

// Mock the Tooltip components to isolate the component's structure.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the icon component used for the timeline event.
vi.mock("react-icons/hi2", () => ({
  HiOutlineClipboardDocumentCheck: () => <span data-testid="icon-check" />,
}));

// Mock the date formatting functions to return predictable, controlled values.
vi.mock("date-fns", () => ({
  format: (_date: Date, str: string) => `Formatted: ${str}`,
  formatDistanceToNow: () => "2 hours ago",
}));

// Helper function to create a mock log entry with default values.
const createLogEntry = (
  id: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  timestamp: string = "2025-01-01T10:00:00Z"
): LogEntry => {
  return {
    id,
    field,
    oldValue,
    newValue,
    timestamp: new Date(timestamp),
    user: { name: "Test User", image: null },
    batchId: "batch-1",
    caseId: "case-1",
    userId: "user-1",
  } as unknown as LogEntry;
};

/**
 * Test suite for the `HistoryLogTimelineEvent` component.
 */
describe("HistoryLogTimelineEvent", () => {
  beforeEach(() => {
    // Reset all mock function calls before each test.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the component renders nothing when the `batchLogs` array is empty.
   */
  it("renders nothing if batchLogs is empty", () => {
    // Arrange: Render the component with an empty log array.
    const { container } = render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={[]} />);
    // Assert: Check that the rendered container is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the rendering of a single change log event, including user information and the old/new values.
   */
  it("renders a standard single change event", () => {
    // Arrange: Define a single log entry changing the `caseName`.
    const logs = [createLogEntry("1", "caseName", "Old Name", "New Name")];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the presence of the user name and the singular summary text.
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText(/made 1 change/)).toBeInTheDocument();

    // Assert: Check for the displayed field label and the old and new values.
    expect(screen.getByText("Case name:")).toBeInTheDocument();
    expect(screen.getByText("Old Name")).toBeInTheDocument();
    expect(screen.getByText("New Name")).toBeInTheDocument();
  });

  /**
   * Test case to verify the rendering of multiple change log entries and the correct pluralized summary text.
   */
  it("renders multiple changes with plural text", () => {
    // Arrange: Define two log entries.
    const logs = [
      createLogEntry("1", "caseName", "Old", "New"),
      createLogEntry("2", "temperatureCelsius", 20, 25),
    ];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the pluralized summary text indicating two changes.
    expect(screen.getByText(/made 2 changes/)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the changed fields are sorted according to a predefined priority order, regardless of their order in the input array.
   */
  it("sorts fields according to priority order", () => {
    // Arrange: Define logs where `locationCity` is first, but `caseName` has higher display priority.
    const logs = [
      createLogEntry("1", "locationCity", "City A", "City B"),
      createLogEntry("2", "caseName", "Name A", "Name B"),
    ];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Get all rendered list items and verify that the first item is "Case name" and the second is "City".
    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveTextContent("Case name");
    expect(listItems[1]).toHaveTextContent("City");
  });

  /**
   * Test case to verify the specialized display logic for the "pmiRecalculation" log type, which breaks down the change into days, hours, and minutes.
   */
  it("renders special PMI recalculation layout", () => {
    // Arrange: Define old and new PMI values with structure.
    const oldPmi = { minutes: 10, hours: 2, days: 0 };
    const newPmi = { minutes: 30, hours: 5, days: 1 };

    // Arrange: Define the PMI recalculation log entry.
    const logs = [createLogEntry("1", "pmiRecalculation", oldPmi, newPmi)];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the specific PMI recalculation action text.
    expect(screen.getByText(/triggered PMI recalculation/)).toBeInTheDocument();

    // Assert: Check for detailed breakdown of minutes.
    expect(screen.getByText("Minutes:")).toBeInTheDocument();
    expect(screen.getByText("10 minutes")).toBeInTheDocument();
    expect(screen.getByText("30 minutes")).toBeInTheDocument();

    // Assert: Check for detailed breakdown of hours.
    expect(screen.getByText("Hours:")).toBeInTheDocument();
    expect(screen.getByText("2 hours")).toBeInTheDocument();
    expect(screen.getByText("5 hours")).toBeInTheDocument();

    // Assert: Check for detailed breakdown of days, handling singular/plural labels.
    expect(screen.getByText("Days:")).toBeInTheDocument();
    expect(screen.getByText("0 days")).toBeInTheDocument();
    expect(screen.getByText("1 day")).toBeInTheDocument();
  });

  /**
   * Test case to verify that null, undefined, or empty string values in log entries are rendered as a placeholder string ("empty").
   */
  it("handles null/empty values correctly", () => {
    // Arrange: Define a log entry where the new value is an empty string.
    const logs = [createLogEntry("1", "locationRegion", null, "")];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check that at least one "empty" placeholder element is present.
    const emptyElements = screen.getAllByText("empty");
    expect(emptyElements.length).toBeGreaterThan(0);
  });

  /**
   * Test case to verify that temperature values are formatted to two decimal places and include the Celsius unit.
   */
  it("formats temperature values with unit", () => {
    // Arrange: Define a log entry with temperature changes (float and integer).
    const logs = [createLogEntry("1", "temperatureCelsius", 20.5, 25)];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the presence of the formatted temperature values.
    expect(screen.getByText("20.50 °C")).toBeInTheDocument();
    expect(screen.getByText("25.00 °C")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the timestamp is rendered using the mocked relative distance and that the Tooltip contains the detailed, formatted absolute time.
   */
  it("renders the timestamp tooltip", () => {
    // Arrange: Define a log entry.
    const logs = [createLogEntry("1", "caseName", "A", "B")];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the presence of the mocked relative time ("2 hours ago").
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();

    // Assert: Check the content of the tooltip for the detailed formatted date string.
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent(
      "Formatted: MMMM d, yyyy 'at' h:mm:ss a"
    );
  });

  /**
   * Test case to verify that the `caseDate` field, which represents date and time, is formatted with a specific format string.
   */
  it("formats caseDate field correctly", () => {
    // Arrange: Define a log entry for `caseDate` changes.
    const logs = [createLogEntry("1", "caseDate", "2025-01-01T10:00:00Z", "2025-01-02T15:30:00Z")];
    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the presence of the formatted date, confirming the format string was used.
    const formattedDates = screen.getAllByText("Formatted: MMM d, yyyy, h:mm a");
    expect(formattedDates.length).toBeGreaterThan(0);
  });

  /**
   * Test case to verify handling of PMI recalculation logs when the old and new values are null (missing data).
   */
  it("handles missing PMI data (N/A output)", () => {
    // Arrange: Define a log entry for `pmiRecalculation` with null values.
    const logs = [createLogEntry("1", "pmiRecalculation", null, null)];

    // Arrange: Render the component.
    render(<HistoryLogTimelineEvent batchId="batch-1" batchLogs={logs} />);

    // Assert: Check for the specific PMI recalculation action text.
    expect(screen.getByText(/triggered PMI recalculation/)).toBeInTheDocument();

    // Assert: Check that N/A placeholders are rendered for all time components (minutes, hours, days).
    const naMinutes = screen.getAllByText("N/A minute");
    expect(naMinutes.length).toBeGreaterThan(0);

    const naHours = screen.getAllByText("N/A hour");
    expect(naHours.length).toBeGreaterThan(0);

    const naDays = screen.getAllByText("N/A day");
    expect(naDays.length).toBeGreaterThan(0);
  });
});
