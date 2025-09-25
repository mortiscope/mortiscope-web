import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCases } from "@/features/results/actions/get-cases";
import { useCases } from "@/features/results/hooks/use-cases";

// Mock the server action responsible for retrieving the list of cases.
vi.mock("@/features/results/actions/get-cases", () => ({
  getCases: vi.fn(),
}));

/**
 * Utility function to create a `QueryClientProvider` wrapper for testing hooks.
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
 * Test suite for the `useCases` custom hook.
 */
describe("useCases", () => {
  /**
   * Test case to verify that the hook successfully fetches and returns case data from the server.
   */
  it("fetches and returns cases successfully", async () => {
    // Arrange: Define a sample array of case data.
    const mockData = [
      { id: "case-1", caseName: "Test Case 1" },
      { id: "case-2", caseName: "Test Case 2" },
    ];

    // Arrange: Mock the server action to resolve with the sample data.
    vi.mocked(getCases).mockResolvedValue(
      mockData as unknown as Awaited<ReturnType<typeof getCases>>
    );

    // Act: Render the hook within the QueryClient context.
    const { result } = renderHook(() => useCases(), {
      wrapper: createWrapper(),
    });

    // Assert: Wait for the query status to reflect success.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Assert: Verify the returned data matches the mock and the server action was invoked.
    expect(result.current.data).toEqual(mockData);
    expect(getCases).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the hook correctly captures and reports server-side errors.
   */
  it("handles errors from the server action", async () => {
    // Arrange: Mock the server action to throw a specific error.
    const mockError = new Error("Failed to fetch");
    vi.mocked(getCases).mockRejectedValue(mockError);

    // Act: Render the hook.
    const { result } = renderHook(() => useCases(), {
      wrapper: createWrapper(),
    });

    // Assert: Wait for the query status to reflect the error state.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Assert: Verify that the error object in the hook matches the thrown error.
    expect(result.current.error).toEqual(mockError);
  });
});
