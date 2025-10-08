import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DashboardAnalysisSkeleton,
  DashboardHeaderSkeleton,
  DashboardMetricsGridSkeleton,
  DashboardSkeleton,
  DashboardTableSkeleton,
} from "@/features/dashboard/components/dashboard-skeleton";

// Mock the base UI Skeleton component to facilitate easier element tracking in the DOM.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="mock-skeleton" className={className} />
  ),
}));

/**
 * Test suite for the Dashboard Skeleton components.
 */
describe("Dashboard Skeletons", () => {
  /**
   * Tests for the DashboardHeaderSkeleton component.
   */
  describe("DashboardHeaderSkeleton", () => {
    /**
     * Test case to verify that the header skeleton container uses the correct flexbox and responsive classes.
     */
    it("renders the container with correct classes", () => {
      // Arrange: Render the header skeleton.
      const { container } = render(<DashboardHeaderSkeleton />);
      const div = container.firstChild;

      // Assert: Check for vertical alignment on mobile and horizontal alignment on medium screens.
      expect(div).toHaveClass("flex flex-col items-center gap-4");
      expect(div).toHaveClass("md:flex-row");
    });
  });

  /**
   * Tests for the `DashboardMetricsGridSkeleton` component.
   */
  describe("DashboardMetricsGridSkeleton", () => {
    /**
     * Test case to verify that the metrics grid renders the exact number of placeholder items.
     */
    it("renders exactly 6 skeleton items for metrics", () => {
      // Act: Render the metrics grid skeleton.
      render(<DashboardMetricsGridSkeleton />);
      const skeletons = screen.getAllByTestId("mock-skeleton");

      // Assert: Verify that six individual metric placeholders are present.
      expect(skeletons).toHaveLength(6);
    });

    /**
     * Test case to verify the responsive grid configuration for the metrics section.
     */
    it("renders with correct grid layout classes", () => {
      // Arrange: Render the component.
      const { container } = render(<DashboardMetricsGridSkeleton />);
      const grid = container.firstChild;

      // Assert: Verify the two-column mobile and six-column large screen layout.
      expect(grid).toHaveClass("grid");
      expect(grid).toHaveClass("grid-cols-2");
      expect(grid).toHaveClass("lg:grid-cols-6");
    });
  });

  /**
   * Tests for the DashboardAnalysisSkeleton component.
   */
  describe("DashboardAnalysisSkeleton", () => {
    /**
     * Test case to verify that the analysis section contains placeholders for its specific widgets.
     */
    it("renders exactly 3 skeleton items for the analysis widgets", () => {
      // Act: Render the analysis section skeleton.
      render(<DashboardAnalysisSkeleton />);
      const skeletons = screen.getAllByTestId("mock-skeleton");

      // Assert: Verify the presence of three main widget placeholders.
      expect(skeletons).toHaveLength(3);
    });

    /**
     * Test case to verify the complex grid span properties of the forensic insights placeholder.
     */
    it("renders the forensic insights skeleton (first item) with distinct classes", () => {
      // Arrange: Render the component.
      render(<DashboardAnalysisSkeleton />);
      const skeletons = screen.getAllByTestId("mock-skeleton");
      const forensicSkeleton = skeletons[0];

      // Assert: Verify the multi-column and multi-row spanning behavior for large screens.
      expect(forensicSkeleton).toHaveClass("md:col-span-2");
      expect(forensicSkeleton).toHaveClass("lg:col-span-4");
      expect(forensicSkeleton).toHaveClass("lg:row-span-2");
    });
  });

  /**
   * Tests for the DashboardTableSkeleton component.
   */
  describe("DashboardTableSkeleton", () => {
    /**
     * Test case to verify that the table area is represented by a single large placeholder.
     */
    it("renders a single large skeleton for the table", () => {
      // Act: Render the table skeleton.
      render(<DashboardTableSkeleton />);
      const skeletons = screen.getAllByTestId("mock-skeleton");

      // Assert: Ensure exactly one large block is rendered for the data table area.
      expect(skeletons).toHaveLength(1);
    });
  });

  /**
   * Tests for the main DashboardSkeleton component.
   */
  describe("DashboardSkeleton", () => {
    /**
     * Test case to verify that the main skeleton aggregate renders the correct total count of sub-placeholders.
     */
    it("combines all sub-skeletons correctly", () => {
      // Act: Render the full dashboard skeleton.
      render(<DashboardSkeleton />);

      // Assert: Verify total placeholder count (1 header + 6 metrics + 3 analysis widgets).
      const skeletons = screen.getAllByTestId("mock-skeleton");
      expect(skeletons).toHaveLength(10);
    });

    /**
     * Test case to verify the primary layout container for the entire dashboard loading state.
     */
    it("renders the main container with correct flex classes", () => {
      // Arrange: Render the full component.
      const { container } = render(<DashboardSkeleton />);
      const div = container.firstChild;

      // Assert: Verify the vertical stacking and spacing of the combined sections.
      expect(div).toHaveClass("flex");
      expect(div).toHaveClass("flex-col");
      expect(div).toHaveClass("gap-4");
    });
  });
});
