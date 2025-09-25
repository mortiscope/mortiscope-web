import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseById } from "@/features/results/actions/get-case-by-id";
import { type CaseWithRelations } from "@/features/results/components/results-view";
import { useCaseData } from "@/features/results/hooks/use-case-data";

// Mock the server action responsible for fetching case details by identifier.
vi.mock("@/features/results/actions/get-case-by-id", () => ({
  getCaseById: vi.fn(),
}));

/**
 * Creates a higher-order component wrapper providing a `QueryClientProvider` context.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  Wrapper.displayName = "Wrapper";

  return Wrapper;
};

/**
 * Test suite for the `useCaseData` custom hook.
 */
describe("useCaseData", () => {
  // Arrange: Define static mock data representing the initial state provided to the hook.
  const mockInitialData = {
    id: "case-123",
    caseName: "Initial Case Name",
    userId: "user-1",
    status: "active",
    createdAt: new Date("2025-12-12T00:00:00.000Z"),
  } as unknown as CaseWithRelations;

  // Arrange: Define static mock data representing the updated state returned from a server fetch.
  const mockFetchedData = {
    id: "case-123",
    caseName: "Updated Case Name",
    userId: "user-1",
    status: "active",
    createdAt: new Date("2025-12-12T00:00:00.000Z"),
  } as unknown as CaseWithRelations;

  // Reset all mocks and set a default successful resolution for the case fetcher before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCaseById).mockResolvedValue(
      mockInitialData as unknown as Awaited<ReturnType<typeof getCaseById>>
    );
  });

  /**
   * Test case to verify that providing `initialData` allows for immediate rendering without a loading state.
   */
  it("uses initialData immediately without loading state", () => {
    // Arrange: Render the hook with pre-populated initial data.
    const { result } = renderHook(() => useCaseData("case-123", mockInitialData), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that the current data matches the initial input and success flags are set.
    expect(result.current.data).toEqual(mockInitialData);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * Test case to verify that the hook correctly triggers a server request when a manual refetch is performed.
   */
  it("calls getCaseById when fetching updated data", async () => {
    // Arrange: Render the hook and verify the initial data presence.
    const { result } = renderHook(() => useCaseData("case-123", mockInitialData), {
      wrapper: createWrapper(),
    });

    expect(result.current.data?.caseName).toBe("Initial Case Name");

    // Act: Update the mock to return the refreshed data and trigger a `refetch`.
    vi.mocked(getCaseById).mockImplementation(async () => {
      return mockFetchedData as unknown as Awaited<ReturnType<typeof getCaseById>>;
    });

    await result.current.refetch();

    // Assert: Verify that the hook state eventually synchronizes with the newly fetched data.
    await waitFor(() => {
      expect(result.current.data).toEqual(mockFetchedData);
    });

    expect(getCaseById).toHaveBeenCalledWith("case-123");
  });
});
