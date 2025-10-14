import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordVerificationSection } from "@/features/account/components/password-verification-section";

// Mock the Hi2 icon library to verify visual state indicators for the password field lock status.
vi.mock("react-icons/hi2", () => ({
  HiOutlineLockClosed: () => <span data-testid="icon-lock-closed" />,
  HiOutlineLockOpen: () => <span data-testid="icon-lock-open" />,
}));

// Mock the Lucide icon library to verify the presence of a loading spinner during verification.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
}));

// Mock the Phosphorus icon library to check for submission and status seal icons.
vi.mock("react-icons/pi", () => ({
  PiPaperPlaneRight: () => <span data-testid="icon-submit" />,
  PiSealPercent: () => <span data-testid="icon-seal-percent" />,
  PiSealWarning: () => <span data-testid="icon-seal-warning" />,
}));

// Mock the shared UI button component to track interaction events and button attributes.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock tooltip components to ensure child elements render without environmental complexity.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the specialized password input component to verify its interaction with error states and accessibility.
vi.mock("@/features/account/components/account-password-input", () => ({
  AccountPasswordInput: ({
    placeholder,
    disabled,
    onChange,
    value,
    hasError,
  }: React.ComponentProps<"input"> & { hasError?: boolean; value?: string }) => (
    <input
      data-testid="password-input"
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      value={value}
      data-error={hasError}
    />
  ),
}));

// Mock form components to simulate the rendering of the current password field within a form context.
vi.mock("@/components/ui/form", () => ({
  FormField: ({
    render,
  }: {
    render: (props: {
      field: { onChange: () => void; value: string; name: string };
    }) => React.ReactNode;
  }) =>
    render({
      field: {
        onChange: vi.fn(),
        value: "",
        name: "currentPassword",
      },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
}));

/**
 * Test suite for the `PasswordVerificationSection` component.
 */
describe("PasswordVerificationSection", () => {
  const mockOnPasswordLockToggle = vi.fn();
  const mockOnPasswordVerification = vi.fn();
  const mockOnCurrentPasswordChange = vi.fn();

  type FormSchema = {
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
  };

  // Mock the React Hook Form instance to provide the expected structure and watching capabilities.
  const mockForm = {
    control: {},
    formState: {
      errors: {},
    },
    watch: vi.fn(),
  } as unknown as import("react-hook-form").UseFormReturn<FormSchema>;

  // Define default props to maintain consistency across test cases.
  const defaultProps = {
    form: mockForm,
    isPasswordLocked: true,
    isPasswordSubmitEnabled: false,
    verifyPasswordIsPending: false,
    onPasswordLockToggle: mockOnPasswordLockToggle,
    onPasswordVerification: mockOnPasswordVerification,
    onCurrentPasswordChange: mockOnCurrentPasswordChange,
  };

  /**
   * Test case to verify that the section displays the correct static text and placeholders.
   */
  it("renders the section with correct label and placeholder", () => {
    // Arrange: Render the component with default credentials props.
    render(<PasswordVerificationSection {...defaultProps} />);

    // Assert: Verify the section header and input placeholder text are correct.
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter current password")).toBeInTheDocument();
  });

  /**
   * Test case to verify the UI behavior when the password field is in a locked state.
   */
  it("displays locked state correctly", () => {
    // Arrange: Set the `isPasswordLocked` prop to true.
    render(<PasswordVerificationSection {...defaultProps} isPasswordLocked={true} />);

    // Assert: Verify the input is disabled and the closed lock icon is visible.
    const input = screen.getByTestId("password-input");
    expect(input).toBeDisabled();
    expect(screen.getByTestId("icon-lock-closed")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-lock-open")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the UI behavior when the password field is in an unlocked state.
   */
  it("displays unlocked state correctly", () => {
    // Arrange: Set the `isPasswordLocked` prop to false.
    render(<PasswordVerificationSection {...defaultProps} isPasswordLocked={false} />);

    // Assert: Verify the input is active and the open lock icon is visible.
    const input = screen.getByTestId("password-input");
    expect(input).not.toBeDisabled();
    expect(screen.getByTestId("icon-lock-open")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-lock-closed")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the lock toggle button executes the corresponding callback.
   */
  it("calls onPasswordLockToggle when lock button is clicked", () => {
    // Arrange: Render the component.
    render(<PasswordVerificationSection {...defaultProps} />);

    // Act: Simulate a user clicking the unlock toggle.
    const lockButton = screen.getByLabelText("Unlock");
    fireEvent.click(lockButton);

    // Assert: Confirm the toggle handler was executed once.
    expect(mockOnPasswordLockToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that typing in the input field triggers the password change callback.
   */
  it("calls onCurrentPasswordChange when input value changes", () => {
    // Arrange: Render the component in an unlocked state.
    render(<PasswordVerificationSection {...defaultProps} isPasswordLocked={false} />);

    // Act: Simulate entering a password value.
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "secret123" } });

    // Assert: Confirm the handler received the specific input string.
    expect(mockOnCurrentPasswordChange).toHaveBeenCalledWith("secret123");
  });

  /**
   * Test case to verify that the submit button is disabled when submission is not authorized.
   */
  it("disables submit button when isPasswordSubmitEnabled is false", () => {
    // Arrange: Set `isPasswordSubmitEnabled` to false.
    render(<PasswordVerificationSection {...defaultProps} isPasswordSubmitEnabled={false} />);

    // Assert: Confirm the submit button is non-interactive.
    const submitButton = screen.getByLabelText("Submit");
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test case to verify that the submit button is enabled when authorized and triggers the verification logic.
   */
  it("enables submit button and calls onPasswordVerification when clicked", () => {
    // Arrange: Set `isPasswordSubmitEnabled` to true.
    render(<PasswordVerificationSection {...defaultProps} isPasswordSubmitEnabled={true} />);

    // Act: Click the enabled submit button.
    const submitButton = screen.getByLabelText("Submit");
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    // Assert: Confirm the verification handler was executed once.
    expect(mockOnPasswordVerification).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the submit icon is replaced by a loading spinner while verification is in progress.
   */
  it("shows loading spinner when verifyPasswordIsPending is true", () => {
    // Arrange: Set `verifyPasswordIsPending` to true.
    render(
      <PasswordVerificationSection
        {...defaultProps}
        isPasswordSubmitEnabled={true}
        verifyPasswordIsPending={true}
      />
    );

    // Assert: Confirm the spinner is visible and the submit icon is hidden.
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-submit")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the input element reflects an error state when form validation fails.
   */
  it("passes error state to input when form has errors", () => {
    // Arrange: Mock the form state to include an error for the `currentPassword` field.
    const errorForm = {
      ...mockForm,
      formState: {
        errors: {
          currentPassword: { message: "Invalid password", type: "custom" },
        },
      },
    } as unknown as import("react-hook-form").UseFormReturn<FormSchema>;

    render(<PasswordVerificationSection {...defaultProps} form={errorForm} />);

    // Assert: Confirm the input element has the error data attribute enabled.
    const input = screen.getByTestId("password-input");
    expect(input).toHaveAttribute("data-error", "true");
  });
});
