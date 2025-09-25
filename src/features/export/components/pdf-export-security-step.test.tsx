import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { PdfExportSecurityStep } from "@/features/export/components/pdf-export-security-step";

// Mock browser APIs that are not implemented in JSDOM to support pointer events and scrolling.
beforeAll(() => {
  window.Element.prototype.hasPointerCapture = vi.fn(() => false);
  window.Element.prototype.setPointerCapture = vi.fn();
  window.Element.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

/**
 * Groups related tests into a suite for the PDF Export Security Step component.
 */
describe("PdfExportSecurityStep", () => {
  const defaultProps = {
    securityLevel: "standard" as const,
    onSecurityLevelChange: vi.fn(),
    pageSize: "a4" as const,
    onPageSizeChange: vi.fn(),
    password: "",
    onPasswordChange: vi.fn(),
    isPending: false,
  };

  /**
   * Test case to verify that the security options are rendered correctly.
   */
  it("renders the security options correctly", () => {
    // Arrange: Render the component with default props.
    render(<PdfExportSecurityStep {...defaultProps} />);

    // Assert: Verify that security option titles and descriptions are present.
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("A standard PDF anyone can open, edit, or print.")).toBeInTheDocument();
    expect(screen.getByText("View-Protected")).toBeInTheDocument();
    expect(screen.getByText("Requires a password to open and view.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the security level change callback is triggered when an option is selected.
   */
  it("calls onSecurityLevelChange when an option is selected", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<PdfExportSecurityStep {...defaultProps} onSecurityLevelChange={handleChange} />);

    // Act: Click on the "View-Protected" option.
    await user.click(screen.getByText("View-Protected"));

    // Assert: Verify that the handler was called with the correct value.
    expect(handleChange).toHaveBeenCalledWith("view_protected");
  });

  /**
   * Test case to verify that the page size selector renders and triggers the change callback.
   */
  it("renders page size selector and calls onPageSizeChange", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<PdfExportSecurityStep {...defaultProps} onPageSizeChange={handleChange} />);

    // Act: Click the combobox trigger to open the menu.
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("A4 (21 cm x 29.7 cm)")).toBeInTheDocument();

    await user.click(trigger);

    // Act: Select the "Letter" option from the dropdown.
    const letterOption = await screen.findByText("Letter (21.59 cm x 27.94 cm)");
    await user.click(letterOption);

    // Assert: Verify that the handler was called with "letter".
    expect(handleChange).toHaveBeenCalledWith("letter");
  });

  /**
   * Test case to verify that the password input is disabled when the security level is set to 'standard'.
   */
  it("disables password input when security level is 'standard'", () => {
    // Arrange: Render the component with `securityLevel` set to "standard".
    render(<PdfExportSecurityStep {...defaultProps} securityLevel="standard" />);

    // Assert: Check that the password input field is disabled.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeDisabled();
  });

  /**
   * Test case to verify that the password input is enabled when the security level is set to 'view_protected'.
   */
  it("enables password input when security level is 'view_protected'", () => {
    // Arrange: Render the component with `securityLevel` set to "view_protected".
    render(<PdfExportSecurityStep {...defaultProps} securityLevel="view_protected" />);

    // Assert: Check that the password input field is enabled.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeEnabled();
  });

  /**
   * Test case to verify that the password change callback is triggered when typing in the password field.
   */
  it("calls onPasswordChange when typing in the password field", async () => {
    // Arrange: Setup user event and render with enabled password input.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <PdfExportSecurityStep
        {...defaultProps}
        securityLevel="view_protected"
        onPasswordChange={handleChange}
      />
    );

    // Act: Type text into the password input field.
    const input = screen.getByPlaceholderText("Enter password");
    await user.type(input, "secret");

    // Assert: Verify that the change handler was called.
    expect(handleChange).toHaveBeenCalled();
  });

  /**
   * Test case to verify that validation errors are displayed when an invalid password is provided.
   */
  it("displays password validation error when provided", () => {
    // Arrange: Render the component with a short password.
    render(
      <PdfExportSecurityStep {...defaultProps} securityLevel="view_protected" password="short" />
    );

    // Assert: Verify that the validation error message is displayed.
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that all input elements are disabled when the component is in a pending state.
   */
  it("disables all inputs when isPending is true", () => {
    // Arrange: Render the component with `isPending` set to true.
    render(<PdfExportSecurityStep {...defaultProps} isPending={true} />);

    // Assert: Check that radio buttons, password input, and select trigger are disabled.
    const radioItems = screen.getAllByRole("radio");
    radioItems.forEach((radio) => expect(radio).toBeDisabled());

    expect(screen.getByPlaceholderText("Enter password")).toBeDisabled();

    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeDisabled();
  });

  /**
   * Test case to verify that the selected security option is visually highlighted.
   */
  it("highlights the selected security option", () => {
    // Arrange: Render the component with "view_protected" selected.
    render(<PdfExportSecurityStep {...defaultProps} securityLevel="view_protected" />);

    // Assert: Verify active styling on the selected option and default styling on the unselected option.
    const selectedLabel = screen.getByText("View-Protected").closest("label");
    expect(selectedLabel).toHaveClass("border-emerald-400", "bg-emerald-50");

    const unselectedLabel = screen.getByText("Standard").closest("label");
    expect(unselectedLabel).toHaveClass("border-slate-200");
  });

  /**
   * Test case to verify that the component handles null props gracefully.
   */
  it("handles null values for securityLevel and pageSize", () => {
    // Arrange: Render the component with null `securityLevel` and `pageSize`.
    render(
      <PdfExportSecurityStep
        {...defaultProps}
        securityLevel={null}
        pageSize={null as unknown as "a4"}
      />
    );

    // Assert: Verify that radio buttons are unchecked and the default placeholder text is shown.
    const radioButtons = screen.getAllByRole("radio");
    radioButtons.forEach((radio) => {
      expect(radio).toHaveAttribute("aria-checked", "false");
    });

    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeInTheDocument();
    expect(screen.getByText("Select Page Size")).toBeInTheDocument();
  });
});
