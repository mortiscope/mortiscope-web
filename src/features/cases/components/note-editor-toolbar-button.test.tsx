import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { NoteEditorToolbarButton } from "@/features/cases/components/note-editor-toolbar-button";

// Mock the Toggle component from the interface library to isolate button behavior and simulate state.
vi.mock("@/components/ui/toggle", () => ({
  Toggle: ({
    onPressedChange,
    pressed,
    disabled,
    className,
    "aria-label": ariaLabel,
    children,
  }: {
    onPressedChange: () => void;
    pressed: boolean;
    disabled: boolean;
    className: string;
    "aria-label": string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onPressedChange}
      data-pressed={pressed}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

// Mock the Tooltip components to verify tooltip content rendering.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Define default props for the button component.
const defaultProps = {
  children: <span data-testid="icon">B</span>,
  tooltip: "Bold",
  isActive: false,
  onClick: vi.fn(),
  ariaLabel: "Toggle Bold",
};

/**
 * Test suite for the `NoteEditorToolbarButton` component.
 */
describe("NoteEditorToolbarButton", () => {
  /**
   * Test case to verify that the button renders with the correct accessible label and child content.
   */
  it("renders the button with correct aria-label and content", () => {
    // Arrange: Render the component.
    render(<NoteEditorToolbarButton {...defaultProps} />);

    // Assert: Check for the presence of the button using its accessible name.
    const button = screen.getByRole("button", { name: "Toggle Bold" });
    expect(button).toBeInTheDocument();
    // Assert: Check for the presence of the child icon content.
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the provided tooltip text is rendered in the mocked tooltip content area.
   */
  it("renders the tooltip text", () => {
    // Arrange: Render the component.
    render(<NoteEditorToolbarButton {...defaultProps} />);

    // Assert: Check that the tooltip content element contains the expected text.
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Bold");
  });

  /**
   * Test case to verify that active state styling classes are applied when `isActive` is true.
   */
  it("handles the active state styling", () => {
    // Arrange: Render the component in an active state.
    render(<NoteEditorToolbarButton {...defaultProps} isActive={true} />);

    // Assert: Check for the `data-pressed` attribute and the specific green styling classes.
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-pressed", "true");
    expect(button).toHaveClass("bg-green-100", "text-green-600", "border-green-600");
  });

  /**
   * Test case to verify that base inactive state styling classes are applied when `isActive` is false.
   */
  it("handles the inactive state styling", () => {
    // Arrange: Render the component in an inactive state.
    render(<NoteEditorToolbarButton {...defaultProps} isActive={false} />);

    // Assert: Check for the `data-pressed` attribute and the default color class.
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-pressed", "false");
    expect(button).toHaveClass("text-slate-600");
    // Assert: Check for the absence of active state classes.
    expect(button).not.toHaveClass("bg-green-100");
  });

  /**
   * Test case to verify that the button and its container receive correct disabled styling and attributes when `isDisabled` is true.
   */
  it("handles the disabled state", () => {
    // Arrange: Render the component in a disabled state.
    render(<NoteEditorToolbarButton {...defaultProps} isDisabled={true} />);

    // Assert: Check that the button element is disabled.
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    // Assert: Check for disabled styling classes on the button.
    expect(button).toHaveClass("cursor-not-allowed", "hover:text-slate-500");

    // Assert: Check that the parent wrapper element also receives the disabled cursor class.
    const wrapper = button.parentElement;
    expect(wrapper).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the `onClick` handler is executed when the enabled button is clicked.
   */
  it("calls onClick when clicked", async () => {
    // Arrange: Define a mock function for the click event and set up user events.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock handler.
    render(<NoteEditorToolbarButton {...defaultProps} onClick={onClickMock} />);

    // Act: Click the button.
    const button = screen.getByRole("button");
    await user.click(button);

    // Assert: Check that the mock click handler was called exactly once.
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `onClick` handler is not executed when the button is disabled.
   */
  it("does not call onClick when disabled", async () => {
    // Arrange: Define a mock click handler and set up user events.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component in a disabled state with the mock handler.
    render(<NoteEditorToolbarButton {...defaultProps} isDisabled={true} onClick={onClickMock} />);

    // Act: Attempt to click the button.
    const button = screen.getByRole("button");
    await user.click(button);

    // Assert: Check that the mock click handler was never called.
    expect(onClickMock).not.toHaveBeenCalled();
  });
});
