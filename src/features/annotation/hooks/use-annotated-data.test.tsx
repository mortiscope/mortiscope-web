import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

// Mock the action responsible for fetching case details by identifier.
vi.mock("@/features/results/actions/get-case-by-id", () => ({
  getCaseById: vi.fn(),
}));

// Mock the analyze store to control state selection during testing.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnalyzeState = ExtractState<typeof useAnalyzeStore>;

// Create a wrapper component to provide a fresh React Query context for each test.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useAnnotatedData` custom hook logic and data transformations.
 */
describe("useAnnotatedData", () => {
  const mockCaseId = "case-123";
  const mockDateOlder = new Date("2025-01-01T10:00:00Z");
  const mockDateNewer = new Date("2025-01-02T10:00:00Z");

  // Define sample upload data used to verify transformation and sorting.
  const mockUploads = [
    {
      id: "img-1",
      name: "Sample-Image.jpg",
      size: 2000,
      createdAt: mockDateNewer,
      url: "url-1",
    },
    {
      id: "img-2",
      name: "Test-Image.png",
      size: 1000,
      createdAt: mockDateOlder,
      url: "url-2",
    },
  ];

  // Define the expected structure of the fetched case data.
  const mockCaseData = {
    caseName: "Test Case",
    uploads: mockUploads,
  };

  // Reset mocks and provide default store implementations before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "date-uploaded-desc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    vi.mocked(getCaseById).mockResolvedValue(
      mockCaseData as unknown as Awaited<ReturnType<typeof getCaseById>>
    );
  });

  /**
   * Verify that the hook provides safe default values while the data fetching is in progress.
   */
  it("returns default empty state when data is loading or undefined", async () => {
    // Arrange: Mock the fetch action to remain in a pending state.
    vi.mocked(getCaseById).mockReturnValue(new Promise(() => {}));

    // Act: Render the hook within the query provider.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that loading flags and empty placeholders are returned.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.caseName).toBe("");
    expect(result.current.images).toEqual([]);
    expect(result.current.totalImages).toBe(0);
  });

  /**
   * Ensure that fetched data is correctly mapped and enriched with total image counts.
   */
  it("fetches and transforms case data correctly", async () => {
    // Arrange: Use the default success mocks defined in the setup.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    // Act: Wait for the query to resolve successfully.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Check that case names and image properties are transformed correctly.
    expect(result.current.caseName).toBe("Test Case");
    expect(result.current.totalImages).toBe(2);

    expect(result.current.images[0]).toEqual(
      expect.objectContaining({
        name: "Sample-Image",
        size: 2000,
      })
    );
    expect(result.current.images[1]).toEqual(
      expect.objectContaining({
        name: "Test-Image",
        size: 1000,
      })
    );
  });

  /**
   * Verify that the image list is correctly ordered by name in ascending order.
   */
  it("sorts by name ascending", async () => {
    // Arrange: Update the store mock to return the name-asc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "name-asc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Render the hook and wait for the sorting logic to process.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Ensure Sample-Image appears before Test-Image.
    expect(result.current.images[0].name).toBe("Sample-Image");
    expect(result.current.images[1].name).toBe("Test-Image");
  });

  /**
   * Verify that the image list is correctly ordered by name in descending order.
   */
  it("sorts by name descending", async () => {
    // Arrange: Update the store mock to return the name-desc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "name-desc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Render the hook and wait for the processing to complete.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Ensure Test-Image appears before Sample-Image.
    expect(result.current.images[0].name).toBe("Test-Image");
    expect(result.current.images[1].name).toBe("Sample-Image");
  });

  /**
   * Verify that the image list is correctly ordered by file size in ascending order.
   */
  it("sorts by size ascending", async () => {
    // Arrange: Update the store mock to return the size-asc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "size-asc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Execute the hook within the query context.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Verify that the 1000 byte image precedes the 2000 byte image.
    expect(result.current.images[0].size).toBe(1000);
    expect(result.current.images[1].size).toBe(2000);
  });

  /**
   * Verify that the image list is correctly ordered by file size in descending order.
   */
  it("sorts by size descending", async () => {
    // Arrange: Update the store mock to return the size-desc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "size-desc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Execute the hook and wait for state resolution.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Verify that the 2000 byte image precedes the 1000 byte image.
    expect(result.current.images[0].size).toBe(2000);
    expect(result.current.images[1].size).toBe(1000);
  });

  /**
   * Verify the default behavior of sorting by upload date in descending order.
   */
  it("sorts by date modified/uploaded descending (default)", async () => {
    // Arrange: Mock the default sort behavior for uploaded dates.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "date-uploaded-desc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Render the hook.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Check that the newer date appears first in the array.
    expect(result.current.images[0].createdAt).toEqual(mockDateNewer);
    expect(result.current.images[1].createdAt).toEqual(mockDateOlder);
  });

  /**
   * Verify that the image list is correctly ordered by upload date in ascending order.
   */
  it("sorts by date modified/uploaded ascending", async () => {
    // Arrange: Update the store mock to return the date-uploaded-asc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "date-uploaded-asc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Execute the hook and wait for data transformation.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Check that the older date appears first in the array.
    expect(result.current.images[0].createdAt).toEqual(mockDateOlder);
    expect(result.current.images[1].createdAt).toEqual(mockDateNewer);
  });

  /**
   * Verify that the image list is correctly ordered by modification date in descending order.
   */
  it("sorts by date modified descending", async () => {
    // Arrange: Update the store mock to return the date-modified-desc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "date-modified-desc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Render the hook within the test wrapper.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Verify that the newest modified image is the first element.
    expect(result.current.images[0].createdAt).toEqual(mockDateNewer);
    expect(result.current.images[1].createdAt).toEqual(mockDateOlder);
  });

  /**
   * Verify that the image list is correctly ordered by modification date in ascending order.
   */
  it("sorts by date modified ascending", async () => {
    // Arrange: Update the store mock to return the date-modified-asc sort option.
    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const state = { sortOption: "date-modified-asc" } as unknown as AnalyzeState;
      return typeof selector === "function" ? selector(state) : state;
    });

    // Act: Render the hook and wait for loading to finish.
    const { result } = renderHook(() => useAnnotatedData(mockCaseId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Verify that the oldest modified image is the first element.
    expect(result.current.images[0].createdAt).toEqual(mockDateOlder);
    expect(result.current.images[1].createdAt).toEqual(mockDateNewer);
  });

  /**
   * Ensure that the fetch action is not triggered when the identifier is invalid or empty.
   */
  it("does not fetch if caseId is missing", () => {
    // Arrange: Pass an empty string as the case identifier.
    const { result } = renderHook(() => useAnnotatedData(""), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that the fetch function was never called and the list remains empty.
    expect(result.current.isLoading).toBe(false);
    expect(getCaseById).not.toHaveBeenCalled();
    expect(result.current.images).toEqual([]);
  });
});
