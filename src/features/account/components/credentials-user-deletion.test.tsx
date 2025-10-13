import { fireEvent, render, screen } from "@testing-library/react";
import { UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { CredentialsUserDeletion } from "@/features/account/components/credentials-user-deletion";

// Mock the Hi2 icon library to verify visual indicators for password field locking states.
vi.mock("react-icons/hi2", () => ({
  HiOutlineLockClosed: () => <span data-testid="icon-lock-closed" />,
  HiOutlineLockOpen: () => <span data-testid="icon-lock-open" />,
}));

// Mock the Lucide icon library to verify the presence of a loading spinner during verification.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
}));

// Mock the Phosphorus icon library to check for visibility toggles and submission icons.
vi.mock("react-icons/pi", () => ({
  PiEye: () => <span data-testid="icon-eye" />,
  PiEyeSlash: () => <span data-testid="icon-eye-slash" />,
  PiPaperPlaneRight: () => <span data-testid="icon-submit" />,
  PiSealPercent: () => <span />,
  PiSealWarning: () => <span />,
}));

// Mock the standard UI button to track clicks and verify disabled/aria-label attributes.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  ),
}));

// Mock the custom input component to facilitate password attribute testing and event simulation.
vi.mock("@/components/ui/input", () => ({
  Input: ({
    type,
    placeholder,
    disabled,
    onChange,
    ...props
  }: {
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => (
    <input
      data-testid="password-input"
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  ),
}));

// Mock tooltip providers to ensure child elements are rendered correctly without overlay complexity.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock form components to simulate the rendering of the password field within the form context.
vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    render,
  }: {
    render: (props: {
      field: {
        value: string;
        onChange: () => void;
        onBlur: () => void;
        name: string;
      };
    }) => React.ReactNode;
  }) =>
    render({
      field: {
        value: "",
        onChange: vi.fn(),
        onBlur: vi.fn(),
        name: "password",
      },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
}));

/**
 * Test suite for the `CredentialsUserDeletion` component.
 */
describe("CredentialsUserDeletion", () => {
  const mockOnPasswordLockToggle = vi.fn();
  const mockOnPasswordVerification = vi.fn();
  const mockOnPasswordChange = vi.fn();
  const mockOnDeleteAccount = vi.fn();
  const mockSetShowPassword = vi.fn();

  const mockForm = {
    control: {},
    formState: {
      errors: {},
    },
    watch: vi.fn(),
    handleSubmit: vi.fn(),
  } as unknown as UseFormReturn<{ password: string }>;

  const defaultProps = {
    form: mockForm,
    isPasswordLocked: true,
    showPassword: false,
    isPasswordSubmitEnabled: false,
    isDeleteEnabled: false,
    verifyPasswordIsPending: false,
    onPasswordLockToggle: mockOnPasswordLockToggle,
    onPasswordVerification: mockOnPasswordVerification,
    onPasswordChange: mockOnPasswordChange,
    onDeleteAccount: mockOnDeleteAccount,
    setShowPassword: mockSetShowPassword,
  };

  /**
   * Test case to verify the initial rendering of the security form elements.
   */
  it("renders the password input and buttons", () => {
    // Arrange: Render the component with default credentials props.
    render(<CredentialsUserDeletion {...defaultProps} />);

    // Assert: Check for the password field and the primary deletion button.
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
  });

  /**
   * Test case to verify that typing in the password field triggers the change handler.
   */
  it("handles password input changes", () => {
    // Arrange: Render the component in an unlocked state.
    render(<CredentialsUserDeletion {...defaultProps} isPasswordLocked={false} />);

    // Act: Simulate entering a password.
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "secret" } });

    // Assert: Verify the `onPasswordChange` callback received the input value.
    expect(mockOnPasswordChange).toHaveBeenCalledWith("secret");
  });

  /**
   * Test case to verify that the password visibility toggle correctly updates the input type and icons.
   */
  it("toggles password visibility", () => {
    // Arrange: Render the component with the password obscured.
    const { rerender } = render(
      <CredentialsUserDeletion {...defaultProps} showPassword={false} isPasswordLocked={false} />
    );

    const input = screen.getByTestId("password-input");
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("icon-eye-slash")).toBeInTheDocument();

    // Act: Click the visibility toggle button.
    const toggleBtn = screen.getByLabelText("Show password");
    fireEvent.click(toggleBtn);

    // Assert: Verify the visibility setter was called.
    expect(mockSetShowPassword).toHaveBeenCalledWith(true);

    // Act: Update props to simulate the state change.
    rerender(
      <CredentialsUserDeletion {...defaultProps} showPassword={true} isPasswordLocked={false} />
    );

    // Assert: Verify the input type is now plain text.
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByTestId("icon-eye")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the unlock button triggers the lock toggle handler.
   */
  it("handles lock toggle interaction", () => {
    // Arrange: Render the component in a locked state.
    render(<CredentialsUserDeletion {...defaultProps} isPasswordLocked={true} />);

    // Act: Click the unlock button.
    const lockBtn = screen.getByLabelText("Unlock");
    fireEvent.click(lockBtn);

    // Assert: Check that the lock toggle callback was executed.
    expect(mockOnPasswordLockToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the password verification request is triggered when the submit button is clicked.
   */
  it("handles password verification submission", () => {
    // Arrange: Enable the submission button via props.
    render(<CredentialsUserDeletion {...defaultProps} isPasswordSubmitEnabled={true} />);

    // Act: Click the password verification submit button.
    const submitBtn = screen.getByLabelText("Submit");
    fireEvent.click(submitBtn);

    // Assert: Verify the verification callback was executed.
    expect(mockOnPasswordVerification).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the final deletion request is triggered when the enabled delete button is clicked.
   */
  it("handles account deletion", () => {
    // Arrange: Enable the account deletion button via props.
    render(<CredentialsUserDeletion {...defaultProps} isDeleteEnabled={true} />);

    // Act: Click the final delete button.
    const deleteBtn = screen.getByText("Delete Account");
    fireEvent.click(deleteBtn);

    // Assert: Verify the deletion callback was executed.
    expect(mockOnDeleteAccount).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the UI correctly restricts the input field and displays the closed lock icon when locked.
   */
  it("displays locked state correctly", () => {
    // Arrange: Render the component in a locked state.
    render(<CredentialsUserDeletion {...defaultProps} isPasswordLocked={true} />);

    // Assert: Confirm the input is disabled and the closed lock icon is visible.
    const input = screen.getByTestId("password-input");
    expect(input).toBeDisabled();
    expect(screen.getByTestId("icon-lock-closed")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI enables the input field and displays the open lock icon when unlocked.
   */
  it("displays unlocked state correctly", () => {
    // Arrange: Render the component in an unlocked state.
    render(<CredentialsUserDeletion {...defaultProps} isPasswordLocked={false} />);

    // Assert: Confirm the input is active and the open lock icon is visible.
    const input = screen.getByTestId("password-input");
    expect(input).not.toBeDisabled();
    expect(screen.getByTestId("icon-lock-open")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the submission icon is replaced by a loading spinner during the verification process.
   */
  it("displays pending verification state", () => {
    // Arrange: Set the verification status to pending.
    render(
      <CredentialsUserDeletion
        {...defaultProps}
        isPasswordSubmitEnabled={true}
        verifyPasswordIsPending={true}
      />
    );

    // Assert: Confirm the loader icon is visible and the submit icon is hidden.
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-submit")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the delete button is visually and functionally disabled until verification is complete.
   */
  it("disables delete button when isDeleteEnabled is false", () => {
    // Arrange: Disable the delete button via props.
    render(<CredentialsUserDeletion {...defaultProps} isDeleteEnabled={false} />);

    // Assert: Verify the button's disabled state and specific CSS styling.
    const deleteBtn = screen.getByText("Delete Account");
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that form validation errors are rendered to the user.
   */
  it("displays form error message", () => {
    // Arrange: Mock the form state to include a password validation error.
    const errorForm = {
      ...mockForm,
      formState: {
        errors: {
          password: { message: "Invalid password" },
        },
      },
    } as unknown as UseFormReturn<{ password: string }>;

    render(<CredentialsUserDeletion {...defaultProps} form={errorForm} />);

    // Assert: Confirm the error message text is displayed in the document.
    expect(screen.getByText("Invalid password")).toBeInTheDocument();
  });
});
