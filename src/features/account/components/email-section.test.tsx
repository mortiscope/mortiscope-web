import { fireEvent, render, screen } from "@testing-library/react";
import { UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { EmailSection } from "@/features/account/components/email-section";
import { AccountSecurityFormValues } from "@/features/account/schemas/account";

// Mock the Hi2 icon library to verify visual state indicators for the email lock status.
vi.mock("react-icons/hi2", () => ({
  HiOutlineLockClosed: () => <span data-testid="icon-lock-closed" />,
  HiOutlineLockOpen: () => <span data-testid="icon-lock-open" />,
}));

// Mock the Lucide icon library to verify the rendering of a loading spinner during updates.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
}));

// Mock the Phosphorus icon library to check for the save icon and status seals.
vi.mock("react-icons/pi", () => ({
  PiFloppyDiskBack: () => <span data-testid="icon-save" />,
  PiSealPercent: () => <span />,
  PiSealWarning: () => <span />,
}));

// Mock the UI button component to track interaction events and attribute states.
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

// Mock the UI input component to facilitate easy targeting and attribute inspection in tests.
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="email-input" {...props} />
  ),
}));

// Mock tooltip components to ensure child elements are rendered without environmental complexity.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock form components to simulate the rendering of the email field within the form context.
vi.mock("@/components/ui/form", () => ({
  FormField: ({
    render,
  }: {
    render: (props: {
      field: { value: string; onChange: () => void; name: string };
    }) => React.ReactNode;
  }) =>
    render({
      field: {
        value: "",
        onChange: vi.fn(),
        name: "email",
      },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
}));

/**
 * Test suite for the `EmailSection` component.
 */
describe("EmailSection", () => {
  const mockOnEmailLockToggle = vi.fn();
  const mockOnEmailUpdate = vi.fn();

  // Mock the React Hook Form instance to provide necessary control and state objects.
  const mockForm = {
    control: {},
    formState: {
      errors: {},
    },
    watch: vi.fn(),
    handleSubmit: vi.fn(),
  } as unknown as UseFormReturn<Pick<AccountSecurityFormValues, "email">>;

  // Define standard props for the component to maintain test consistency.
  const defaultProps = {
    form: mockForm,
    isSocialUser: false,
    isSocialProviderLoading: false,
    isEmailLocked: true,
    isEmailSaveEnabled: false,
    updateEmailIsPending: false,
    onEmailLockToggle: mockOnEmailLockToggle,
    onEmailUpdate: mockOnEmailUpdate,
  };

  /**
   * Test case to verify that the component returns an empty output if social provider data is still loading.
   */
  it("renders nothing when social provider is loading", () => {
    // Arrange: Set the `isSocialProviderLoading` prop to true.
    const { container } = render(<EmailSection {...defaultProps} isSocialProviderLoading={true} />);

    // Assert: Verify that the DOM output is completely empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the primary UI elements are rendered when data is loaded.
   */
  it("renders the email section correctly when loaded", () => {
    // Arrange: Render the component with default props.
    render(<EmailSection {...defaultProps} />);

    // Assert: Confirm the presence of the section label and the email input field.
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the email field is disabled and shows a closed lock icon when the `isEmailLocked` prop is true.
   */
  it("renders locked state correctly for standard users", () => {
    // Arrange: Set the `isEmailLocked` prop to true.
    render(<EmailSection {...defaultProps} isEmailLocked={true} />);

    // Assert: Verify the input is disabled and the correct lock icon is present.
    const input = screen.getByTestId("email-input");
    expect(input).toBeDisabled();
    expect(screen.getByTestId("icon-lock-closed")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-lock-open")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the email field is enabled and shows an open lock icon when the `isEmailLocked` prop is false.
   */
  it("renders unlocked state correctly for standard users", () => {
    // Arrange: Set the `isEmailLocked` prop to false.
    render(<EmailSection {...defaultProps} isEmailLocked={false} />);

    // Assert: Verify the input is active and the open lock icon is present.
    const input = screen.getByTestId("email-input");
    expect(input).not.toBeDisabled();
    expect(screen.getByTestId("icon-lock-open")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-lock-closed")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that social provider users cannot edit their email and have no access to lock or save controls.
   */
  it("hides action buttons and disables input for social users", () => {
    // Arrange: Set `isSocialUser` to true.
    render(<EmailSection {...defaultProps} isSocialUser={true} isEmailLocked={false} />);

    // Assert: Confirm the input is disabled despite the lock status, and control buttons are hidden.
    const input = screen.getByTestId("email-input");
    expect(input).toBeDisabled();

    expect(screen.queryByLabelText("Lock")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unlock")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Save")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the lock toggle button executes the corresponding callback prop.
   */
  it("calls onEmailLockToggle when lock button is clicked", () => {
    // Arrange: Render the component in a locked state.
    render(<EmailSection {...defaultProps} isEmailLocked={true} />);

    // Act: Simulate a user clicking the unlock button.
    const lockButton = screen.getByLabelText("Unlock");
    fireEvent.click(lockButton);

    // Assert: Check that the lock toggle handler was called once.
    expect(mockOnEmailLockToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the save button is disabled when the `isEmailSaveEnabled` prop is false.
   */
  it("disables save button when isEmailSaveEnabled is false", () => {
    // Arrange: Set `isEmailSaveEnabled` to false.
    render(<EmailSection {...defaultProps} isEmailSaveEnabled={false} />);

    // Assert: Confirm the save button is not interactive.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();
  });

  /**
   * Test case to verify that the save button is enabled when valid changes exist and triggers the update callback.
   */
  it("enables save button and calls onEmailUpdate when clicked", () => {
    // Arrange: Set `isEmailSaveEnabled` to true.
    render(<EmailSection {...defaultProps} isEmailSaveEnabled={true} />);

    // Act: Click the enabled save button.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    // Assert: Confirm the update handler was called once.
    expect(mockOnEmailUpdate).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the save icon is replaced by a loading spinner when an update is in progress.
   */
  it("shows loading spinner on save button when updateEmailIsPending is true", () => {
    // Arrange: Set `updateEmailIsPending` to true.
    render(
      <EmailSection {...defaultProps} isEmailSaveEnabled={true} updateEmailIsPending={true} />
    );

    // Assert: Confirm the presence of the loader and the absence of the static save icon.
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-save")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the static save icon is displayed when no update is currently pending.
   */
  it("shows save icon when updateEmailIsPending is false", () => {
    // Arrange: Set `updateEmailIsPending` to false.
    render(
      <EmailSection {...defaultProps} isEmailSaveEnabled={true} updateEmailIsPending={false} />
    );

    // Assert: Confirm the presence of the save icon and the absence of the loader.
    expect(screen.getByTestId("icon-save")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the input element receives red border styling when form validation for the email field fails.
   */
  it("applies error styling to input when form has errors", () => {
    // Arrange: Mock the form state to contain an error for the email field.
    const errorForm = {
      ...mockForm,
      formState: {
        errors: {
          email: { message: "Invalid email" },
        },
      },
    } as unknown as UseFormReturn<Pick<AccountSecurityFormValues, "email">>;

    render(<EmailSection {...defaultProps} form={errorForm} />);

    // Assert: Verify that the input element has the specific TailWind error class applied.
    const input = screen.getByTestId("email-input");
    expect(input).toHaveClass("border-red-500");
  });
});
