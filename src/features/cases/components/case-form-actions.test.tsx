import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { CaseFormActions } from "@/features/cases/components/case-form-actions";

// Define the default set of props for the component under test.
const defaultProps = {
  status: "details",
  isSaving: false,
  isValid: true,
  onPrev: vi.fn(),
};

/**
 * Test suite for the `CaseFormActions` component.
 */
describe("CaseFormActions", () => {
  /**
   * Test case to verify that the primary submit button renders with the correct default text and attributes.
   */
  it("renders the submit button with default text", () => {
    // Arrange: Render the component with default properties.
    render(<CaseFormActions {...defaultProps} />);

    // Assert: Check that the submit button is present, enabled, and has the correct `type` attribute.
    const submitBtn = screen.getByRole("button", { name: "Save and Continue" });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveAttribute("type", "submit");
  });

  /**
   * Test case to verify that the "Previous" button is suppressed when the form `status` is "details" (the first step).
   */
  it("does not render the 'Previous' button when status is 'details'", () => {
    // Arrange: Render the component with the initial "details" status.
    render(<CaseFormActions {...defaultProps} status="details" />);

    // Assert: Check that the "Previous" button is not present in the document.
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Previous" button is rendered when the form `status` is past the first step.
   */
  it("renders the 'Previous' button when status is not 'details'", () => {
    // Arrange: Render the component with a non-initial status, such as "capture".
    render(<CaseFormActions {...defaultProps} status="capture" />);

    // Assert: Check that the "Previous" button is present and enabled.
    const prevBtn = screen.getByRole("button", { name: "Previous" });
    expect(prevBtn).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();
  });

  /**
   * Test case to verify that the `onPrev` handler is called when the "Previous" button is clicked.
   */
  it("calls onPrev when 'Previous' is clicked", async () => {
    // Arrange: Set up user events and render the component in a state where the "Previous" button is visible.
    const user = userEvent.setup();
    render(<CaseFormActions {...defaultProps} status="capture" />);

    // Act: Click the "Previous" button.
    const prevBtn = screen.getByRole("button", { name: "Previous" });
    await user.click(prevBtn);

    // Assert: Check that the mock `onPrev` function was called exactly once.
    expect(defaultProps.onPrev).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the submit button is disabled when the form is invalid.
   */
  it("disables the submit button when isValid is false", () => {
    // Arrange: Render the component with `isValid` set to false.
    render(<CaseFormActions {...defaultProps} isValid={false} />);

    // Assert: Check that the submit button is present and disabled.
    const submitBtn = screen.getByRole("button", { name: "Save and Continue" });
    expect(submitBtn).toBeDisabled();
  });

  /**
   * Test case to verify that both the submit and previous buttons are disabled, and the submit button displays loading text, when the form is saving.
   */
  it("shows loading text and disables buttons when isSaving is true", () => {
    // Arrange: Render the component with `isSaving` set to true and a status that shows both buttons.
    render(<CaseFormActions {...defaultProps} status="capture" isSaving={true} />);

    // Assert: Check that the submit button is present, displays "Saving...", and is disabled.
    const submitBtn = screen.getByRole("button", { name: "Saving..." });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Assert: Check that the "Previous" button is also disabled during the saving state.
    const prevBtn = screen.getByRole("button", { name: "Previous" });
    expect(prevBtn).toBeDisabled();
  });
});
