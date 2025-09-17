import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ReviewProcessingOverlay } from "@/features/cases/components/review-processing-overlay";

// Mock the external `BeatLoader` component to isolate styling prop verification.
vi.mock("react-spinners", () => ({
  BeatLoader: ({ color, size }: { color: string; size: number }) => (
    <div data-testid="beat-loader" data-color={color} data-size={size}>
      Loading...
    </div>
  ),
}));

/**
 * Test suite for the `ReviewProcessingOverlay` component.
 */
describe("ReviewProcessingOverlay", () => {
  /**
   * Test case to verify that the custom message text is rendered with the expected styling classes.
   */
  it("renders the processing message", () => {
    // Arrange: Define a test message.
    const message = "Analyzing images...";
    // Arrange: Render the component.
    render(<ReviewProcessingOverlay message={message} />);

    // Assert: Check for the presence of the message text.
    expect(screen.getByText(message)).toBeInTheDocument();
    // Assert: Check for specific font and text alignment classes.
    expect(screen.getByText(message)).toHaveClass("font-plus-jakarta-sans text-center text-lg");
  });

  /**
   * Test case to verify that the loader component renders with the required green color and size settings.
   */
  it("renders the loader with correct configuration", () => {
    // Arrange: Render the component.
    render(<ReviewProcessingOverlay message="Processing" />);

    // Assert: Check for the presence of the mocked loader element.
    const loader = screen.getByTestId("beat-loader");
    expect(loader).toBeInTheDocument();
    // Assert: Check that the loader uses the specified color code (green) and size (12).
    expect(loader).toHaveAttribute("data-color", "#16a34a");
    expect(loader).toHaveAttribute("data-size", "12");
  });

  /**
   * Test case to verify that the root element of the overlay applies correct absolute positioning, z-index, centering, and backdrop effects.
   */
  it("renders the overlay container with correct styles", () => {
    // Arrange: Render the component.
    const { container } = render(<ReviewProcessingOverlay message="Processing" />);

    // Assert: Check the root element's classes.
    const overlayDiv = container.firstChild;

    expect(overlayDiv).toHaveClass(
      "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm"
    );
  });
});
