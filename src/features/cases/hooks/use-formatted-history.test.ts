import { describe, expect, it } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { useFormattedHistory } from "@/features/cases/hooks/use-formatted-history";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Defines the expected type for the raw case history data array.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
// Defines the type for a single log entry within the history array.
type LogEntry = CaseHistoryData[number];

// Utility function to create a mock log entry for testing.
const createLog = (id: string, timestamp: string, batchId: string): LogEntry =>
  ({
    id,
    timestamp: new Date(timestamp),
    batchId,
    field: "test",
    oldValue: "a",
    newValue: "b",
    caseId: "case-1",
    userId: "user-1",
    user: { name: "Test User", image: null },
  }) as unknown as LogEntry;

/**
 * Test suite for the `useFormattedHistory` hook.
 */
describe("useFormattedHistory", () => {
  /**
   * Test case to verify that an empty object is returned when the input data is undefined.
   */
  it("returns empty object if data is undefined", () => {
    // Act: Render the hook with undefined data.
    const { result } = renderHook(() => useFormattedHistory(undefined));
    // Assert: Check that the result is an empty object.
    expect(result.current).toEqual({});
  });

  /**
   * Test case to verify that an empty object is returned when the input data is an empty array.
   */
  it("returns empty object if data is empty array", () => {
    // Act: Render the hook with an empty array.
    const { result } = renderHook(() => useFormattedHistory([]));
    // Assert: Check that the result is an empty object.
    expect(result.current).toEqual({});
  });

  /**
   * Test case to verify that logs are correctly grouped first by the day of the timestamp, and then by the `batchId`.
   */
  it("groups logs by day and then by batchId", () => {
    // Arrange: Define a set of logs spanning two days and three batches.
    const logs = [
      createLog("1", "2025-01-01T10:00:00Z", "batch-a"),
      createLog("2", "2025-01-01T10:05:00Z", "batch-a"),
      createLog("3", "2025-01-01T12:00:00Z", "batch-b"),

      createLog("4", "2025-01-02T09:00:00Z", "batch-c"),
    ];

    // Act: Render the hook with the mock logs.
    const { result } = renderHook(() => useFormattedHistory(logs));

    // Assert: Check that the outer grouping has two keys (days).
    const days = Object.keys(result.current);
    expect(days).toHaveLength(2);

    // Assert: Check the grouping for the first day.
    const day1Key = days.sort()[0];
    const day1Batches = result.current[day1Key];

    // Assert: Check that day one contains the two expected batches.
    expect(Object.keys(day1Batches)).toEqual(["batch-a", "batch-b"]);
    // Assert: Check the count of logs in the first batch.
    expect(day1Batches["batch-a"]).toHaveLength(2);
    // Assert: Check the count of logs in the second batch.
    expect(day1Batches["batch-b"]).toHaveLength(1);

    // Assert: Check the grouping for the second day.
    const day2Key = days.sort()[1];
    const day2Batches = result.current[day2Key];

    // Assert: Check that day two contains the single expected batch.
    expect(Object.keys(day2Batches)).toEqual(["batch-c"]);
    // Assert: Check the count of logs in the batch.
    expect(day2Batches["batch-c"]).toHaveLength(1);
  });

  /**
   * Test case to ensure a single log entry is handled correctly as a single day and single batch.
   */
  it("handles empty batches gracefully (edge case)", () => {
    // Arrange: Define a single log entry.
    const logs = [createLog("1", "2025-01-01T10:00:00Z", "batch-a")];
    // Act: Render the hook.
    const { result } = renderHook(() => useFormattedHistory(logs));

    // Assert: Retrieve the day and batch data keys.
    const dayKey = Object.keys(result.current)[0];
    const batchData = result.current[dayKey]["batch-a"];

    // Assert: Check that the batch data is defined and contains the correct log entry.
    expect(batchData).toBeDefined();
    expect(batchData[0].id).toBe("1");
  });
});
