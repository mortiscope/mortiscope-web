import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewedImagesWidget } from "@/features/results/components/reviewed-images-widget";

// Mock the Card components to simplify the DOM structure and focus on content verification.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}));

// Mock the Font Awesome icons to verify their presence in the UI via test IDs.
vi.mock("react-icons/fa", () => ({
  FaGlasses: ({ className }: { className?: string }) => (
    <span data-testid="icon-glasses" className={className} />
  ),
}));

/**
 * Test suite for the `ReviewedImagesWidget` component.
 */
describe("ReviewedImagesWidget", () => {
  /**
   * Test case to verify that the widget title is rendered correctly.
   */
  it("renders the widget title", () => {
    // Arrange: Render the widget with zeroed props.
    render(<ReviewedImagesWidget hasDetections={false} reviewedCount={0} totalCount={0} />);

    // Assert: Check for the static title text in the document.
    expect(screen.getByText("Reviewed Images")).toBeInTheDocument();
  });

  /**
   * Test case to verify that both the header icon and the decorative background icon are present.
   */
  it("renders the decorative background icon and header icon", () => {
    // Arrange: Render the widget.
    render(<ReviewedImagesWidget hasDetections={false} reviewedCount={0} totalCount={0} />);

    // Act: Query for all instances of the glasses icon.
    const icons = screen.getAllByTestId("icon-glasses");

    // Assert: Ensure exactly two icon instances are rendered.
    expect(icons).toHaveLength(2);
  });

  /**
   * Test case to verify that the progress counts are displayed when the case contains valid detections.
   */
  it("displays the review counts when hasDetections is true", () => {
    // Arrange: Provide props where `hasDetections` is enabled.
    render(<ReviewedImagesWidget hasDetections={true} reviewedCount={5} totalCount={10} />);

    // Assert: Verify the count fraction and the "Images" label are displayed, and the placeholder is hidden.
    expect(screen.getByText("5 / 10")).toBeInTheDocument();
    expect(screen.getByText("Images")).toBeInTheDocument();
    expect(screen.queryByText("No valid images.")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a placeholder message is shown if no detections are present in the case.
   */
  it("displays placeholder text when hasDetections is false", () => {
    // Arrange: Provide props where `hasDetections` is disabled.
    render(<ReviewedImagesWidget hasDetections={false} reviewedCount={0} totalCount={5} />);

    // Assert: Check for the "No valid images" text and ensure the count fraction is not rendered.
    expect(screen.getByText("No valid images.")).toBeInTheDocument();
    expect(screen.queryByText("0 / 5")).not.toBeInTheDocument();
  });
});
