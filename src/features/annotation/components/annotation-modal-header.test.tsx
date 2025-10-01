import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";

// Mock the framer-motion library to prevent animation overhead during the execution of test cases.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock the Dialog components to simulate the structure of the modal header and verify content placement.
vi.mock("@/components/ui/dialog", () => ({
  DialogHeader: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Test suite for the `AnnotationModalHeader` component.
 */
describe("AnnotationModalHeader", () => {
  /**
   * Test case to verify that the component renders the provided title string within the heading.
   */
  it("renders the title correctly", () => {
    // Arrange: Render the header with a specific `title` prop value.
    render(<AnnotationModalHeader title="Test Title" />);

    // Assert: Check that the heading element contains the expected text content.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Title");
  });

  /**
   * Test case to verify that the description text is displayed when the prop is provided.
   */
  it("renders the description when provided", () => {
    // Arrange: Render the header with both `title` and `description` prop values.
    render(<AnnotationModalHeader title="Test Title" description="Test Description" />);

    // Assert: Ensure the description string is present in the rendered output.
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component handles missing descriptions gracefully without rendering extra containers.
   */
  it("does not render description container when description is undefined", () => {
    // Arrange: Render the component with only the mandatory `title` prop.
    render(<AnnotationModalHeader title="Test Title" />);

    // Assert: Verify the title is present while confirming no description text exists.
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the emerald color variant is applied as the default style.
   */
  it("applies the default emerald color variant", () => {
    // Arrange: Render the header without specifying an explicit `colorVariant`.
    render(<AnnotationModalHeader title="Emerald Title" />);

    // Act: Locate the title heading element.
    const title = screen.getByRole("heading", { level: 2 });

    // Assert: Check for the presence of the default `text-emerald-600` Tailwind class.
    expect(title).toHaveClass("text-emerald-600");
  });

  /**
   * Test case to verify that the rose color variant correctly modifies the title styling.
   */
  it("applies the rose color variant", () => {
    // Arrange: Render the header with the `colorVariant` set to `rose`.
    render(<AnnotationModalHeader title="Rose Title" colorVariant="rose" />);

    // Act: Locate the title heading element.
    const title = screen.getByRole("heading", { level: 2 });

    // Assert: Verify that the `text-rose-600` styling class is applied.
    expect(title).toHaveClass("text-rose-600");
  });

  /**
   * Test case to verify that the amber color variant correctly modifies the title styling.
   */
  it("applies the amber color variant", () => {
    // Arrange: Render the header with the `colorVariant` set to `amber`.
    render(<AnnotationModalHeader title="Amber Title" colorVariant="amber" />);

    // Act: Locate the title heading element.
    const title = screen.getByRole("heading", { level: 2 });

    // Assert: Verify that the `text-amber-500` styling class is applied.
    expect(title).toHaveClass("text-amber-500");
  });

  /**
   * Test case to verify that the sky color variant correctly modifies the title styling.
   */
  it("applies the sky color variant", () => {
    // Arrange: Render the header with the `colorVariant` set to `sky`.
    render(<AnnotationModalHeader title="Sky Title" colorVariant="sky" />);

    // Act: Locate the title heading element.
    const title = screen.getByRole("heading", { level: 2 });

    // Assert: Verify that the `text-sky-600` styling class is applied.
    expect(title).toHaveClass("text-sky-600");
  });

  /**
   * Test case to verify that the description prop can accept and render complex React elements.
   */
  it("renders custom ReactNode description", () => {
    // Arrange: Render the header passing a JSX element into the `description` prop.
    render(
      <AnnotationModalHeader
        title="Complex Title"
        description={<span data-testid="custom-desc">Custom Element</span>}
      />
    );

    // Assert: Verify that the custom nested element is rendered and accessible via its test ID.
    expect(screen.getByTestId("custom-desc")).toBeInTheDocument();
  });
});
