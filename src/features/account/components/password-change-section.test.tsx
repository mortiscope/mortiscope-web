import { fireEvent, render, screen } from "@testing-library/react";
import { UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { PasswordChangeSection } from "@/features/account/components/password-change-section";

// Mock the Lucide icon library to verify the presence of the loading spinner during password updates.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
}));

// Mock the Phosphorus icon library to check for the save icon and status seals.
vi.mock("react-icons/pi", () => ({
  PiFloppyDiskBack: () => <span data-testid="icon-save" />,
  PiSealPercent: () => <span />,
  PiSealWarning: () => <span />,
}));

// Mock the UI button component to track interaction events and button states.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the tooltip components to ensure child elements are rendered without environmental complexity.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the specialized password input component to verify its interaction with error states and themes.
vi.mock("@/features/account/components/account-password-input", () => ({
  AccountPasswordInput: ({
    placeholder,
    disabled,
    hasError,
    focusColor,
    ...props
  }: {
    placeholder?: string;
    disabled?: boolean;
    hasError?: boolean;
    focusColor?: string;
    [key: string]: unknown;
  }) => (
    <input
      data-testid="password-input"
      data-focus-color={focusColor}
      placeholder={placeholder}
      disabled={disabled}
      data-error={hasError}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  ),
}));

// Mock form components to simulate the rendering of the password fields within a form context.
vi.mock("@/components/ui/form", () => ({
  FormField: ({
    render,
    name,
  }: {
    render: (props: {
      field: {
        name: string;
        value: string;
        onChange: () => void;
        onBlur: () => void;
      };
    }) => React.ReactNode;
    name: string;
  }) =>
    render({
      field: {
        name,
        value: "",
        onChange: vi.fn(),
        onBlur: vi.fn(),
      },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
}));

/**
 * Test suite for the `PasswordChangeSection` component.
 */
describe("PasswordChangeSection", () => {
  const mockOnPasswordUpdate = vi.fn();

  // Mock the React Hook Form instance to provide necessary control and state objects.
  const mockForm = {
    control: {},
    formState: {
      errors: {},
    },
    watch: vi.fn(),
    handleSubmit: vi.fn(),
  } as unknown as UseFormReturn<{
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
  }>;

  // Define default props for the component to maintain test consistency.
  const defaultProps = {
    form: mockForm,
    isPasswordVerified: false,
    isNewPasswordSaveEnabled: false,
    updatePasswordIsPending: false,
    newPasswordFieldsError: undefined,
    onPasswordUpdate: mockOnPasswordUpdate,
  };

  /**
   * Test case to verify the initial rendering of the new password and confirmation fields.
   */
  it("renders the new password and repeat password fields", () => {
    // Arrange: Render the component with default props.
    render(<PasswordChangeSection {...defaultProps} />);

    // Assert: Confirm the presence of both required password placeholders.
    expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Repeat new password")).toBeInTheDocument();
  });

  /**
   * Test case to verify that password fields remain disabled until the current password is verified.
   */
  it("disables inputs when password is not verified", () => {
    // Arrange: Set `isPasswordVerified` to false.
    render(<PasswordChangeSection {...defaultProps} isPasswordVerified={false} />);

    // Assert: Verify that every password input in the section is disabled.
    const inputs = screen.getAllByTestId("password-input");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  /**
   * Test case to verify that password fields are interactive once the current password is verified.
   */
  it("enables inputs when password is verified", () => {
    // Arrange: Set `isPasswordVerified` to true.
    render(<PasswordChangeSection {...defaultProps} isPasswordVerified={true} />);

    // Assert: Verify that every password input in the section is enabled.
    const inputs = screen.getAllByTestId("password-input");
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
    });
  });

  /**
   * Test case to verify that the save button is disabled when the `isNewPasswordSaveEnabled` prop is false.
   */
  it("disables save button when isNewPasswordSaveEnabled is false", () => {
    // Arrange: Set `isNewPasswordSaveEnabled` to false.
    render(<PasswordChangeSection {...defaultProps} isNewPasswordSaveEnabled={false} />);

    // Assert: Confirm the save button is not interactive.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();
  });

  /**
   * Test case to verify that the save button is enabled and triggers the update callback when clicked.
   */
  it("enables save button and calls onPasswordUpdate when clicked", () => {
    // Arrange: Set `isNewPasswordSaveEnabled` to true.
    render(<PasswordChangeSection {...defaultProps} isNewPasswordSaveEnabled={true} />);

    // Act: Click the enabled save button.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    // Assert: Confirm the update handler was called once.
    expect(mockOnPasswordUpdate).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the save icon is replaced by a loading spinner when the password update is pending.
   */
  it("shows loading spinner on save button when updatePasswordIsPending is true", () => {
    // Arrange: Set `updatePasswordIsPending` to true.
    render(
      <PasswordChangeSection
        {...defaultProps}
        isNewPasswordSaveEnabled={true}
        updatePasswordIsPending={true}
      />
    );

    // Assert: Confirm the loader is visible and the save icon is hidden.
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-save")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the static save icon is displayed when no update is currently pending.
   */
  it("shows save icon when updatePasswordIsPending is false", () => {
    // Arrange: Set `updatePasswordIsPending` to false.
    render(
      <PasswordChangeSection
        {...defaultProps}
        isNewPasswordSaveEnabled={true}
        updatePasswordIsPending={false}
      />
    );

    // Assert: Confirm the presence of the save icon and the absence of the loader.
    expect(screen.getByTestId("icon-save")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that custom error messages are rendered within the component.
   */
  it("displays newPasswordFieldsError when provided", () => {
    // Arrange: Define a specific error message.
    const errorMessage = "Passwords do not match";
    render(<PasswordChangeSection {...defaultProps} newPasswordFieldsError={errorMessage} />);

    // Assert: Check that the error message text is displayed.
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  /**
   * Test case to verify that input elements receive error flags when the form state contains validation errors.
   */
  it("passes error state to inputs when form has errors", () => {
    // Arrange: Mock the form state to contain errors for new and repeated password fields.
    const errorForm = {
      ...mockForm,
      formState: {
        errors: {
          newPassword: { message: "Too short" },
          repeatPassword: { message: "Mismatch" },
        },
      },
    } as unknown as UseFormReturn<{
      currentPassword: string;
      newPassword: string;
      repeatPassword: string;
    }>;

    render(<PasswordChangeSection {...defaultProps} form={errorForm} />);

    // Assert: Verify that both input elements reflect the error state via data attributes.
    const newPassInput = screen.getByPlaceholderText("Enter new password");
    const repeatPassInput = screen.getByPlaceholderText("Repeat new password");

    expect(newPassInput).toHaveAttribute("data-error", "true");
    expect(repeatPassInput).toHaveAttribute("data-error", "true");
  });
});
