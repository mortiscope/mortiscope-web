import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCaseName } from "@/features/results/actions/get-case-name";
import { useCaseName } from "@/features/results/hooks/use-case-name";

// Mock the server action responsible for retrieving the case name from the database.
vi.mock("@/features/results/actions/get-case-name", () => ({
  getCaseName: vi.fn(),
}));

/**
 * Utility to create a `QueryClientProvider` wrapper.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

/**
 * Test suite for the `useCaseName` custom hook.
 */
describe("useCaseName", () => {
  /**
   * Test case to verify successful data retrieval when a valid identifier is passed.
   */
  it("fetches the case name successfully when caseId is provided", async () => {
    // Arrange: Mock a successful string response from the server action.
    vi.mocked(getCaseName).mockResolvedValue("Test Case");

    // Act: Render the hook within the QueryClient wrapper.
    const { result } = renderHook(() => useCaseName("case-123"), {
      wrapper: createWrapper(),
    });

    // Assert: Wait for the query to resolve and verify the returned data and function call.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ caseName: "Test Case" });
    expect(getCaseName).toHaveBeenCalledWith("case-123");
  });

  /**
   * Test case to verify that the query remains idle when the identifier is missing.
   */
  it("does not fetch when caseId is null or undefined", async () => {
    // Arrange: Render the hook with a null `caseId`.
    const { result } = renderHook(() => useCaseName(null), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the hook stays in an idle state and does not trigger the server action.
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe("idle");
    expect(getCaseName).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a null response from the server is handled as a successful but empty result.
   */
  it("returns null if the server action returns null (case not found)", async () => {
    // Arrange: Mock the server action to return null, simulating a missing record.
    vi.mocked(getCaseName).mockResolvedValue(null);

    // Act: Render the hook with a non-existent `caseId`.
    const { result } = renderHook(() => useCaseName("case-404"), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the hook resolves successfully with null data.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  /**
   * Test case to verify manual refetch behavior when no case identifier is present.
   */
  it("returns null when manually refetching without a caseId", async () => {
    // Arrange: Render the hook with a null identifier.
    const { result } = renderHook(() => useCaseName(null), {
      wrapper: createWrapper(),
    });

    // Act: Manually trigger the `refetch` function.
    const refetchResult = await result.current.refetch();

    // Assert: Verify the refetch returns null immediately without attempting a network call.
    expect(refetchResult.data).toBeNull();
    expect(getCaseName).not.toHaveBeenCalled();
  });
});
