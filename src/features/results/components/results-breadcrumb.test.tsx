import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, type Mock, vi } from "vitest";

import { ResultsBreadcrumb } from "@/features/results/components/results-breadcrumb";
import { useCaseName } from "@/features/results/hooks/use-case-name";

// Mock the `useCaseName` hook to simulate different data-fetching states.
vi.mock("@/features/results/hooks/use-case-name", () => ({
  useCaseName: vi.fn(),
}));

// Mock the interface breadcrumb components to simplify the DOM structure for assertion.
vi.mock("@/components/ui/breadcrumb", () => ({
  Breadcrumb: ({ children }: { children: React.ReactNode }) => (
    <nav data-testid="breadcrumb">{children}</nav>
  ),
  BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
    <ol data-testid="breadcrumb-list">{children}</ol>
  ),
  BreadcrumbItem: ({ children }: { children: React.ReactNode }) => (
    <li data-testid="breadcrumb-item">{children}</li>
  ),
  BreadcrumbLink: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="breadcrumb-link">{children}</span>
  ),
  BreadcrumbPage: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="breadcrumb-page">{children}</span>
  ),
  BreadcrumbSeparator: () => <li data-testid="breadcrumb-separator">/</li>,
}));

/**
 * Test suite for the `ResultsBreadcrumb` component.
 */
describe("ResultsBreadcrumb", () => {
  /**
   * Test case to verify that a loading indicator is shown while data is being fetched.
   */
  it("displays loading text when data is fetching", () => {
    // Arrange: Configure the hook mock to return an active loading state.
    (useCaseName as unknown as Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    // Act: Render the breadcrumb with a dummy `caseId`.
    render(<ResultsBreadcrumb caseId="123" />);

    // Assert: Check that the loading placeholder text is visible to the user.
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the specific case name is displayed once data is successfully retrieved.
   */
  it("displays the case name when loaded successfully", () => {
    // Arrange: Configure the hook mock to return a successful data object containing a case name.
    (useCaseName as unknown as Mock).mockReturnValue({
      data: { caseName: "My Test Case" },
      isLoading: false,
      error: null,
    });

    // Act: Render the component with the mocked successful response.
    render(<ResultsBreadcrumb caseId="123" />);

    // Assert: Verify that the `caseName` from the data object is rendered in the final breadcrumb segment.
    expect(screen.getByText("My Test Case")).toBeInTheDocument();
  });

  /**
   * Test case to verify that a generic fallback label is used when the API returns no data.
   */
  it("displays fallback 'Case' text when loaded but name is missing", () => {
    // Arrange: Configure the hook mock to return a completed state with null data.
    (useCaseName as unknown as Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    // Act: Render the component in an empty-data scenario.
    render(<ResultsBreadcrumb caseId="123" />);

    // Assert: Check that the default string `Case` is displayed as a fallback.
    expect(screen.getByText("Case")).toBeInTheDocument();
  });

  /**
   * Test case to verify that parent navigation links and static labels are rendered correctly.
   */
  it("renders the static breadcrumb parts correctly", () => {
    // Arrange: Configure the hook mock with valid data to ensure full component rendering.
    (useCaseName as unknown as Mock).mockReturnValue({
      data: { caseName: "Test" },
      isLoading: false,
      error: null,
    });

    // Act: Render the component to inspect the navigation structure.
    render(<ResultsBreadcrumb caseId="123" />);

    // Assert: Verify the presence of the root application name and the results navigation link with the correct `href`.
    expect(screen.getByText("Mortiscope")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Results" })).toHaveAttribute("href", "/results");
  });
});
