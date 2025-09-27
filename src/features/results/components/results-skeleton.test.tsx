import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ResultsAnalysisSkeleton,
  ResultsDetailsSkeleton,
  ResultsHeaderSkeletonWrapper,
  ResultsImagesSkeleton,
} from "@/features/results/components/results-skeleton";
import { LG_GRID_LIMIT, MD_GRID_LIMIT, SM_GRID_LIMIT } from "@/lib/constants";

// Mock the UI Skeleton component to verify that placeholders are rendered with the expected CSS classes and dimensions.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: vi.fn(({ className, ...props }) => (
    <div data-testid="skeleton" className={className} {...props} />
  )),
}));

/**
 * Test suite for the `ResultsHeaderSkeletonWrapper` component.
 */
describe("ResultsHeaderSkeletonWrapper", () => {
  /**
   * Test case to verify that three distinct button placeholders are rendered in the header.
   */
  it("renders three button skeletons", () => {
    // Arrange: Render the header skeleton wrapper.
    render(<ResultsHeaderSkeletonWrapper />);

    // Act: Retrieve all skeleton elements.
    const skeletons = screen.getAllByTestId("skeleton");

    // Assert: Check that the quantity and responsive width classes match the expected layout.
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass("h-10 w-11 shrink-0 bg-white sm:w-[130px]");
    expect(skeletons[2]).toHaveClass("h-10 w-11 shrink-0 bg-white sm:w-[150px]");
  });
});

/**
 * Test suite for the `ResultsDetailsSkeleton` component.
 */
describe("ResultsDetailsSkeleton", () => {
  /**
   * Test case to verify that six cards are rendered to represent the case metadata fields.
   */
  it("renders six detail card skeletons", () => {
    // Arrange: Render the details skeleton.
    render(<ResultsDetailsSkeleton />);

    // Act: Retrieve all skeleton elements.
    const skeletons = screen.getAllByTestId("skeleton");

    // Assert: Verify the count and basic visual styling of the cards.
    expect(skeletons).toHaveLength(6);
    expect(skeletons[0]).toHaveClass("h-40 rounded-2xl bg-white");
  });

  /**
   * Test case to verify that the skeleton container uses the same responsive grid logic as the actual details component.
   */
  it("applies responsive grid classes", () => {
    // Arrange: Render the component and capture the root container.
    const { container } = render(<ResultsDetailsSkeleton />);
    const wrapper = container.firstChild;

    // Assert: Check for grid configuration classes for mobile, tablet, and desktop viewports.
    expect(wrapper).toHaveClass("grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6");
  });
});

/**
 * Test suite for the `ResultsAnalysisSkeleton` component.
 */
describe("ResultsAnalysisSkeleton", () => {
  /**
   * Test case to verify the total number of skeleton elements used to represent the analysis dashboard.
   */
  it("renders a total of 5 skeleton parts for the analysis area", () => {
    // Arrange: Render the analysis skeleton.
    render(<ResultsAnalysisSkeleton />);

    // Assert: Check that the five expected placeholder segments are present.
    expect(screen.getAllByTestId("skeleton")).toHaveLength(5);
  });

  /**
   * Test case to verify the structural integrity and layout of the main chart placeholder.
   */
  it("renders the main chart card structure with correct classes", () => {
    // Arrange: Render the component.
    const { container } = render(<ResultsAnalysisSkeleton />);
    const wrapper = container.firstChild as HTMLElement;

    // Assert: Verify the complex grid and row span classes for the dashboard layout.
    expect(wrapper).toHaveClass(
      "grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2"
    );

    // Act: Target the specific container for the main chart.
    const mainCardContainer = wrapper?.querySelector(".col-span-1.flex.h-96") as HTMLElement;

    // Assert: Verify the container's responsive spanning and its internal skeletons.
    expect(mainCardContainer).toBeInTheDocument();
    expect(mainCardContainer).toHaveClass("lg:col-span-4 lg:row-span-2 lg:h-auto");
    const mainCardSkeletons = mainCardContainer?.querySelectorAll('[data-testid="skeleton"]');
    expect(mainCardSkeletons).toHaveLength(3);
    expect(mainCardSkeletons?.[2]).toHaveClass("h-full w-full flex-grow rounded-2xl bg-slate-100");
  });

  /**
   * Test case to verify the side card placeholders that accompany the main chart.
   */
  it("renders the two side card skeletons", () => {
    // Arrange: Render the analysis skeleton.
    render(<ResultsAnalysisSkeleton />);

    // Act: Filter skeletons to find the side cards based on height class.
    const sideCardSkeletons = screen
      .getAllByTestId("skeleton")
      .filter((el) => el.classList.contains("h-52"));

    // Assert: Verify two side cards are present with the correct desktop column spanning.
    expect(sideCardSkeletons).toHaveLength(2);
    expect(sideCardSkeletons[0]).toHaveClass("h-52 rounded-3xl bg-white lg:col-span-2");
  });
});

/**
 * Test suite for the `ResultsImagesSkeleton` component.
 */
describe("ResultsImagesSkeleton", () => {
  /**
   * Test case to verify the combination of control placeholders and the aggregate sum of image placeholders.
   */
  it("renders skeletons for controls and the correct number of images for each breakpoint", () => {
    // Arrange: Render the images skeleton.
    render(<ResultsImagesSkeleton />);
    const allSkeletons = screen.getAllByTestId("skeleton");

    // Assert: Verify search and view toggle skeletons are rendered first.
    const controlSkeletons = allSkeletons.slice(0, 2);
    expect(controlSkeletons).toHaveLength(2);
    expect(controlSkeletons[0]).toHaveClass("h-10 w-full max-w-sm bg-white");

    // Assert: Verify the total count of image skeletons matches the sum of limits for all viewports.
    const imageSkeletons = allSkeletons.slice(2);
    const expectedTotalImages = LG_GRID_LIMIT + MD_GRID_LIMIT + SM_GRID_LIMIT;
    expect(imageSkeletons).toHaveLength(expectedTotalImages);
  });

  /**
   * Test case to verify the specific grid count and visibility classes for large desktop screens.
   */
  it("renders correct number of LG grid items and checks classes", () => {
    // Arrange: Render the component.
    const { container } = render(<ResultsImagesSkeleton />);
    const rootWrapper = container.firstChild as HTMLElement;

    // Act: Find the desktop-specific grid container.
    const lgGrid = rootWrapper.querySelector(".lg\\:grid");

    // Assert: Verify the count matches `LG_GRID_LIMIT` and the container is hidden by default (controlled by CSS media queries).
    expect(lgGrid).toBeInTheDocument();
    expect(lgGrid?.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(LG_GRID_LIMIT);
    expect(lgGrid).toHaveClass("hidden grid-cols-5 gap-3");
  });

  /**
   * Test case to verify the specific grid count and visibility classes for medium tablet screens.
   */
  it("renders correct number of MD grid items and checks classes", () => {
    // Arrange: Render the component.
    const { container } = render(<ResultsImagesSkeleton />);
    const rootWrapper = container.firstChild as HTMLElement;

    // Act: Find the tablet-specific grid container while excluding the desktop one.
    const mdGrid = rootWrapper.querySelector(".md\\:grid:not(.lg\\:grid)");

    // Assert: Verify the count matches `MD_GRID_LIMIT` and the appropriate responsive hide/show classes are applied.
    expect(mdGrid).toBeInTheDocument();
    expect(mdGrid?.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(MD_GRID_LIMIT);
    expect(mdGrid).toHaveClass("hidden grid-cols-4 gap-3 lg:hidden");
  });

  /**
   * Test case to verify the specific grid count and visibility classes for small mobile screens.
   */
  it("renders correct number of SM grid items and checks classes", () => {
    // Arrange: Render the component.
    const { container } = render(<ResultsImagesSkeleton />);
    const rootWrapper = container.firstChild as HTMLElement;

    // Act: Find the mobile-specific grid container.
    const smGrid = rootWrapper.querySelector(".grid.grid-cols-2.gap-3.md\\:hidden");

    // Assert: Verify the count matches `SM_GRID_LIMIT` and it is hidden on larger screens.
    expect(smGrid).toBeInTheDocument();
    expect(smGrid?.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(SM_GRID_LIMIT);
    expect(smGrid).toHaveClass("grid grid-cols-2 gap-3 md:hidden");
  });
});
