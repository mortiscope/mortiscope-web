import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardModalHeader } from "@/features/dashboard/components/dashboard-modal-header";

// Mock the UI Dialog components to verify proper semantic nesting and prop propagation.
vi.mock("@/components/ui/dialog", () => ({
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-header" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
}));

// Mock framer-motion to avoid animation overhead and allow direct inspection of the layout wrapper.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className} data-testid="motion-div">
        {children}
      </div>
    ),
  },
}));

/**
 * Test suite for the `DashboardModalHeader` component.
 */
describe("DashboardModalHeader", () => {
  const mockVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  /**
   * Test case to verify that the component renders the provided title and description strings.
   */
  it("renders the title and description correctly", () => {
    // Arrange: Define text values for the header.
    const title = "Test Title";
    const description = "Test Description";

    // Act: Render the modal header component.
    render(
      <DashboardModalHeader title={title} description={description} variants={mockVariants} />
    );

    // Assert: Check that the title heading and description paragraph are present with the correct text.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(title);
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  /**
   * Test case to verify that specific CSS classes for fonts, alignment, and colors are applied to the header elements.
   */
  it("applies correct styling classes to text elements", () => {
    // Act: Render the component with styled content.
    render(
      <DashboardModalHeader
        title="Styled Title"
        description="Styled Description"
        variants={mockVariants}
      />
    );

    // Assert: Verify that the title element has the expected typography and color classes.
    const titleElement = screen.getByRole("heading", { level: 2 });
    expect(titleElement).toHaveClass(
      "font-plus-jakarta-sans",
      "text-center",
      "text-xl",
      "font-bold",
      "text-emerald-600"
    );

    // Assert: Verify that the description element has the expected font and color classes.
    const descriptionElement = screen.getByText("Styled Description");
    expect(descriptionElement).toHaveClass(
      "font-inter",
      "text-center",
      "text-sm",
      "text-slate-600"
    );
  });

  /**
   * Test case to verify that the entire header is wrapped in a motion-enabled container with correct padding.
   */
  it("wraps content in a motion div", () => {
    // Act: Render the component.
    render(
      <DashboardModalHeader
        title="Wrapper Test"
        description="Wrapper Desc"
        variants={mockVariants}
      />
    );

    // Assert: Verify the presence of the motion wrapper and its associated layout classes.
    const motionWrapper = screen.getByTestId("motion-div");
    expect(motionWrapper).toBeInTheDocument();
    expect(motionWrapper).toHaveClass("shrink-0", "px-6", "pt-6");
  });
});
