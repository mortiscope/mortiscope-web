import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileInputField } from "@/features/account/components/profile-input-field";

// Mock the shared UI button component to verify click handlers and disabled attributes.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the standard UI input component for interaction testing and value verification.
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Mock the label component to ensure the input field is properly described.
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
}));

// Mock the tooltip system to ensure child content remains accessible during tests.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lock icons to verify visual feedback for read-only versus editable states.
vi.mock("react-icons/hi2", () => ({
  HiOutlineLockClosed: () => <span data-testid="icon-lock-closed" />,
  HiOutlineLockOpen: () => <span data-testid="icon-lock-open" />,
}));

// Mock the loading spinner to verify UI feedback during asynchronous save operations.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
}));

// Mock functional icons to verify the presence of save and status indicators.
vi.mock("react-icons/pi", () => ({
  PiFloppyDiskBack: () => <span data-testid="icon-save" />,
  PiSealPercent: () => <span data-testid="icon-seal" />,
  PiSealWarning: () => <span data-testid="icon-warning" />,
}));

/**
 * Test suite for the `ProfileInputField` component.
 */
describe("ProfileInputField", () => {
  // Define default properties for the component to maintain test consistency.
  const defaultProps = {
    label: "Username",
    placeholder: "Enter username",
    value: "username",
    onChange: vi.fn(),
    isLocked: true,
    onToggleLock: vi.fn(),
    onSave: vi.fn(),
    isSaveEnabled: false,
    isPending: false,
  };

  /**
   * Test case to verify that the label and input are rendered with the expected content.
   */
  it("renders the label and input with correct value", () => {
    // Arrange: Render the component with a specific label and value.
    render(<ProfileInputField {...defaultProps} />);

    // Assert: Verify that the text content and input value are present in the document.
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByDisplayValue("username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the input is non-interactive when the lock state is active.
   */
  it("input is disabled when isLocked is true", () => {
    // Arrange: Render the component with the `isLocked` prop set to true.
    render(<ProfileInputField {...defaultProps} isLocked={true} />);

    // Assert: Verify the input element is disabled and the closed lock icon is visible.
    expect(screen.getByDisplayValue("username")).toBeDisabled();
    expect(screen.getByTestId("icon-lock-closed")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the input is interactive when the lock state is inactive.
   */
  it("input is enabled when isLocked is false", () => {
    // Arrange: Render the component with the `isLocked` prop set to false.
    render(<ProfileInputField {...defaultProps} isLocked={false} />);

    // Assert: Verify the input element is enabled and the open lock icon is visible.
    expect(screen.getByDisplayValue("username")).toBeEnabled();
    expect(screen.getByTestId("icon-lock-open")).toBeInTheDocument();
  });

  /**
   * Test case to verify that user input triggers the `onChange` callback when the field is unlocked.
   */
  it("calls onChange when typing in the input (if unlocked)", () => {
    // Arrange: Render the component in an unlocked state.
    render(<ProfileInputField {...defaultProps} isLocked={false} />);

    // Act: Simulate a text change event in the input field.
    const input = screen.getByDisplayValue("username");
    fireEvent.change(input, { target: { value: "new value" } });

    // Assert: Confirm the `onChange` handler was called with the updated string.
    expect(defaultProps.onChange).toHaveBeenCalledWith("new value");
  });

  /**
   * Test case to verify that clicking the lock toggle button executes the `onToggleLock` callback.
   */
  it("calls onToggleLock when lock button is clicked", () => {
    // Arrange: Render the component.
    render(<ProfileInputField {...defaultProps} />);

    // Act: Simulate a user clicking the toggle button via its aria-label.
    const lockButton = screen.getByLabelText("Unlock");
    fireEvent.click(lockButton);

    // Assert: Confirm the toggle handler prop was executed.
    expect(defaultProps.onToggleLock).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the save button is disabled when changes are not eligible for submission.
   */
  it("disables save button when isSaveEnabled is false", () => {
    // Arrange: Set the `isSaveEnabled` prop to false.
    render(<ProfileInputField {...defaultProps} isSaveEnabled={false} />);

    // Assert: Confirm the save button is non-interactive.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();
  });

  /**
   * Test case to verify that the save button is enabled when the field has valid, pending changes.
   */
  it("enables save button when isSaveEnabled is true", () => {
    // Arrange: Set the `isSaveEnabled` prop to true.
    render(<ProfileInputField {...defaultProps} isSaveEnabled={true} />);

    // Assert: Confirm the save button is interactive.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeEnabled();
  });

  /**
   * Test case to verify that clicking the save button triggers the `onSave` callback.
   */
  it("calls onSave when save button is clicked", () => {
    // Arrange: Enable the save button.
    render(<ProfileInputField {...defaultProps} isSaveEnabled={true} />);

    // Act: Simulate a user clicking the save button.
    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    // Assert: Confirm the `onSave` handler prop was executed.
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the UI indicates a pending state by showing a spinner and locking the save action.
   */
  it("shows loading spinner and disables save button when isPending is true", () => {
    // Arrange: Set the `isPending` prop to true.
    render(<ProfileInputField {...defaultProps} isSaveEnabled={true} isPending={true} />);

    // Assert: Verify the button is disabled and the loader is visible instead of the save icon.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();

    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-save")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the static save icon is displayed when no operation is pending.
   */
  it("shows save icon when not pending", () => {
    // Arrange: Set the `isPending` prop to false.
    render(<ProfileInputField {...defaultProps} isPending={false} />);

    // Assert: Confirm the presence of the save icon and absence of the loader.
    expect(screen.getByTestId("icon-save")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the lock and save control buttons are omitted if the `showLockControls` prop is false.
   */
  it("does not render lock/save controls when showLockControls is false", () => {
    // Arrange: Set the `showLockControls` prop to false.
    render(<ProfileInputField {...defaultProps} showLockControls={false} />);

    // Assert: Confirm that neither the lock toggle nor the save button is present in the document.
    expect(screen.queryByLabelText("Unlock")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Save")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a global disabled state overrides individual lock logic to restrict input.
   */
  it("disables input and adds styling when global isDisabled prop is true", () => {
    // Arrange: Render the component with an unlocked state but a global disabled flag.
    render(<ProfileInputField {...defaultProps} isLocked={false} isDisabled={true} />);

    // Assert: Confirm the input element is disabled despite the individual lock status.
    const input = screen.getByDisplayValue("username");
    expect(input).toBeDisabled();
  });
});
