import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import {
  HistoryLogEmptyState,
  HistoryLogErrorState,
  HistoryLogLoadingState,
} from "@/features/cases/components/history-log-empty-state";

// Mock the external `BeatLoader` component to isolate styling prop verification.
vi.mock("react-spinners", () => ({
  BeatLoader: ({ color, size }: { color: string; size: number }) => (
    <div data-testid="beat-loader" data-color={color} data-size={size}>
      Loading...
    </div>
  ),
}));

// Mock the icon component used across the state displays.
vi.mock("react-icons/hi2", () => ({
  HiMiniListBullet: () => <svg data-testid="icon-list-bullet" />,
}));

/**
 * Test suite for history log state components, verifying rendering of loading, error, and empty states.
 */
describe("History Log States", () => {
  /**
   * Test suite for the `HistoryLogLoadingState` component.
   */
  describe("HistoryLogLoadingState", () => {
    /**
     * Test case to verify that the loading component renders and receives the intended color and size props.
     */
    it("renders the loader with correct styling props", () => {
      // Arrange: Render the loading state component.
      render(<HistoryLogLoadingState />);

      // Assert: Check for the presence of the mocked loader element.
      const loader = screen.getByTestId("beat-loader");
      expect(loader).toBeInTheDocument();
      // Assert: Check that the `data-color` attribute is set to the primary green color code.
      expect(loader).toHaveAttribute("data-color", "#16a34a");
      // Assert: Check that the `data-size` attribute is set to 12.
      expect(loader).toHaveAttribute("data-size", "12");
    });
  });

  /**
   * Test suite for the `HistoryLogErrorState` component.
   */
  describe("HistoryLogErrorState", () => {
    /**
     * Test case to verify that the dedicated error message and the associated icon are displayed.
     */
    it("renders the error message and icon", () => {
      // Arrange: Render the error state component.
      render(<HistoryLogErrorState />);

      // Assert: Check for the specific error message text.
      expect(screen.getByText("Failed to load history.")).toBeInTheDocument();
      // Assert: Check for the presence of the mock list bullet icon.
      expect(screen.getByTestId("icon-list-bullet")).toBeInTheDocument();
    });
  });

  /**
   * Test suite for the `HistoryLogEmptyState` component.
   */
  describe("HistoryLogEmptyState", () => {
    /**
     * Test case to verify that the empty state message and the associated icon are displayed.
     */
    it("renders the empty state message and icon", () => {
      // Arrange: Render the empty state component.
      render(<HistoryLogEmptyState />);

      // Assert: Check for the specific empty state message text.
      expect(screen.getByText("No history available.")).toBeInTheDocument();
      // Assert: Check for the presence of the mock list bullet icon.
      expect(screen.getByTestId("icon-list-bullet")).toBeInTheDocument();
    });
  });
});
