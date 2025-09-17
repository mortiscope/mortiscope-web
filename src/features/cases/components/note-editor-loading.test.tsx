import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { NoteEditorLoading } from "@/features/cases/components/note-editor-loading";

// Mock the external `BeatLoader` component to isolate styling prop verification.
vi.mock("react-spinners", () => ({
  BeatLoader: ({ color, size }: { color: string; size: number }) => (
    <div data-testid="beat-loader" data-color={color} data-size={size}>
      Loader
    </div>
  ),
}));

/**
 * Test suite for the NoteEditorLoading component.
 */
describe("NoteEditorLoading", () => {
  /**
   * Test case to verify that the loader component renders with the required green color and size settings.
   */
  it("renders the loader with correct configuration", () => {
    // Arrange: Render the loading component.
    render(<NoteEditorLoading />);

    // Assert: Check for the presence of the mocked loader element.
    const loader = screen.getByTestId("beat-loader");
    expect(loader).toBeInTheDocument();

    // Assert: Check that the loader uses the specified color code (green) and size (12).
    expect(loader).toHaveAttribute("data-color", "#16a34a");
    expect(loader).toHaveAttribute("data-size", "12");
  });

  /**
   * Test case to verify that default centering and full height styles are applied to the container wrapper.
   */
  it("applies default container styles", () => {
    // Arrange: Render the component.
    const { container } = render(<NoteEditorLoading />);

    // Assert: Check that the root element has the expected flexbox and layout classes for full height and centering.
    expect(container.firstChild).toHaveClass(
      "flex",
      "h-full",
      "flex-col",
      "items-center",
      "justify-center"
    );
  });

  /**
   * Test case to verify that a custom `className` prop is correctly merged with the default container styles.
   */
  it("merges custom className correctly", () => {
    // Arrange: Define a custom class.
    const customClass = "bg-emerald-100";
    // Arrange: Render the component with the custom class.
    const { container } = render(<NoteEditorLoading className={customClass} />);

    // Assert: Check that both a default class and the custom class are present on the root element.
    expect(container.firstChild).toHaveClass("flex");
    expect(container.firstChild).toHaveClass(customClass);
  });
});
