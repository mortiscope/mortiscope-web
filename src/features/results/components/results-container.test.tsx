import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResultsContainer } from "@/features/results/components/results-container";
import { ResultsPreview } from "@/features/results/components/results-preview";
import { useCases } from "@/features/results/hooks/use-cases";
import { ResultsState, useResultsStore } from "@/features/results/store/results-store";

// Mock the data fetching hook to control loading and error states.
vi.mock("@/features/results/hooks/use-cases", () => ({
  useCases: vi.fn(),
}));

// Mock the zustand store to simulate different view modes like grid or list.
vi.mock("@/features/results/store/results-store");

// Mock the child component to isolate the container logic from preview rendering.
vi.mock("@/features/results/components/results-preview", () => ({
  ResultsPreview: vi.fn(() => <div data-testid="results-preview" />),
}));

// Mock the toast notification system to verify error reporting.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock the Skeleton UI component to verify loading placeholders.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

/**
 * Creates a test wrapper providing a clean React Query context for each test.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  TestWrapper.displayName = "TestWrapper";

  return TestWrapper;
};

/**
 * Test suite for the `ResultsContainer` component.
 */
describe("ResultsContainer", () => {
  const mockUseCases = vi.mocked(useCases);
  const mockUseResultsStore = vi.mocked(useResultsStore);

  // Reset mocks and provide default successful implementation before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResultsStore.mockImplementation((selector) =>
      selector({ viewMode: "grid" } as unknown as ResultsState)
    );
    mockUseCases.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { cases: [] },
      isSuccess: true,
    } as unknown as ReturnType<typeof useCases>);
  });

  /**
   * Test case to verify that the results preview is shown when data is ready.
   */
  it("renders ResultsPreview when data is successfully loaded", () => {
    // Arrange: Mock the hook to return a successful state.
    mockUseCases.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useCases>);

    // Act: Render the container within the query provider.
    render(<ResultsContainer />, { wrapper: createWrapper() });

    // Assert: Check that the preview component appears and error messages are absent.
    expect(screen.getByTestId("results-preview")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load cases.")).not.toBeInTheDocument();
    expect(ResultsPreview).toHaveBeenCalled();
  });

  /**
   * Sub-suite specifically for testing the loading skeleton states.
   */
  describe("ResultsSkeleton", () => {
    /**
     * Test case to verify that loading indicators appear during the fetch phase.
     */
    it("renders the skeleton when data is loading", () => {
      // Arrange: Set the hook to a loading state.
      mockUseCases.mockReturnValue({
        isLoading: true,
        isError: false,
        isSuccess: false,
      } as unknown as ReturnType<typeof useCases>);

      // Act: Render the container.
      render(<ResultsContainer />, { wrapper: createWrapper() });

      // Assert: Verify the presence of the status role and the specific number of skeleton placeholders.
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getAllByTestId("skeleton")).toHaveLength(63);
      expect(screen.queryByTestId("results-preview")).not.toBeInTheDocument();
    });

    /**
     * Test case to verify the skeleton layout matches the 'list' view mode.
     */
    it("renders the skeleton with list view layout when viewMode is 'list'", () => {
      // Arrange: Mock loading state and set the store to `list` mode.
      mockUseCases.mockReturnValue({
        isLoading: true,
        isError: false,
        isSuccess: false,
      } as unknown as ReturnType<typeof useCases>);
      mockUseResultsStore.mockImplementation((selector) =>
        selector({ viewMode: "list" } as unknown as ResultsState)
      );

      // Act: Render the component.
      const { container } = render(<ResultsContainer />, { wrapper: createWrapper() });

      // Assert: Verify that the CSS grid and flex classes match the list layout expectations.
      const gridContainer = container.querySelector(".grid.grid-cols-1");
      expect(gridContainer).toBeInTheDocument();
      const listItems = gridContainer!.querySelectorAll(".flex.items-center.justify-between");
      expect(listItems).toHaveLength(20);
      expect(screen.queryByTestId("results-preview")).not.toBeInTheDocument();
    });

    /**
     * Test case to verify the skeleton layout matches the 'grid' view mode.
     */
    it("renders the skeleton with grid view layout (default) when viewMode is 'grid'", () => {
      // Arrange: Mock loading state and set the store to `grid` mode.
      mockUseCases.mockReturnValue({
        isLoading: true,
        isError: false,
        isSuccess: false,
      } as unknown as ReturnType<typeof useCases>);
      mockUseResultsStore.mockImplementation((selector) =>
        selector({ viewMode: "grid" } as unknown as ResultsState)
      );

      // Act: Render the component.
      const { container } = render(<ResultsContainer />, { wrapper: createWrapper() });

      // Assert: Verify that the CSS grid and flex classes match the grid layout expectations.
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();
      const gridItems = container.querySelectorAll(".flex.aspect-square.flex-col");
      expect(gridItems).toHaveLength(20);
      expect(screen.queryByTestId("results-preview")).not.toBeInTheDocument();
    });
  });

  /**
   * Test case to verify error handling and user notification when data fetching fails.
   */
  it("renders skeleton and shows error toast when data loading fails", async () => {
    // Arrange: Mock an error state from the hook.
    mockUseCases.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
    } as unknown as ReturnType<typeof useCases>);

    // Act: Render the container.
    render(<ResultsContainer />, { wrapper: createWrapper() });

    // Assert: Ensure the loading skeleton is shown while the error toast is triggered.
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("results-preview")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load cases.");
    });
  });

  /**
   * Test case to ensure that success states do not trigger false-positive error notifications.
   */
  it("does not show error toast on successful load", () => {
    // Arrange: Mock a successful data state.
    mockUseCases.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useCases>);

    // Act: Render the container.
    render(<ResultsContainer />, { wrapper: createWrapper() });

    // Assert: Verify data is displayed and no toast was called.
    expect(screen.getByTestId("results-preview")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
