import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { SignOutAllForm } from "@/features/account/components/sign-out-all-form";
import { AccountAllSessionsModalFormValues } from "@/features/account/schemas/account";

// Mock the specialized password input to verify prop drilling of focus colors and error states.
vi.mock("@/features/account/components/account-password-input", () => ({
  AccountPasswordInput: ({
    focusColor,
    hasError,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    focusColor?: string;
    hasError?: boolean;
  }) => (
    <input
      data-testid="password-input"
      data-focus-color={focusColor}
      data-has-error={hasError}
      {...props}
    />
  ),
}));

// Ensure the real UI Form components are used to test actual integration with React Hook Form.
vi.unmock("@/components/ui/form");

// Mock the RadioGroup components to simulate value changes and disabled states in a testable way.
vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({
    onValueChange,
    value,
    children,
    disabled,
  }: {
    onValueChange: (val: string) => void;
    value: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <div role="radiogroup" data-disabled={disabled}>
      <input type="hidden" data-testid="radio-group-value" value={value} readOnly />

      <div
        data-testid="radio-group-container"
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          const target = e.target as HTMLElement;
          if (target.dataset.radioValue) {
            onValueChange(target.dataset.radioValue);
          }
        }}
      >
        {children}
      </div>
    </div>
  ),
  RadioGroupItem: ({ value, disabled, id }: { value: string; disabled?: boolean; id?: string }) => (
    <button
      type="button"
      role="radio"
      aria-checked={false}
      id={id}
      disabled={disabled}
      data-radio-value={value}
      className="radio-item"
    />
  ),
}));

/**
 * Utility component to provide the necessary React Hook Form context for the SignOutAllForm.
 */
const TestWrapper = ({
  isSigningOut = false,
  onSubmit = vi.fn(),
  defaultValues = {
    signOutOption: "exclude_current" as const,
    password: "",
  },
}) => {
  const form = useForm<AccountAllSessionsModalFormValues>({
    defaultValues,
  });

  return <SignOutAllForm form={form} isSigningOut={isSigningOut} onSubmit={onSubmit} />;
};

/**
 * Test suite for the `SignOutAllForm` component.
 */
describe("SignOutAllForm", () => {
  /**
   * Test case to verify that the form renders with expected labels and initial values.
   */
  it("renders the form with default values", () => {
    // Arrange: Render the form wrapper with default settings.
    render(<TestWrapper />);

    // Assert: Check for the presence of the two sign-out options and the password requirement text.
    expect(screen.getByText("Keep current device signed in")).toBeInTheDocument();
    expect(screen.getByText("Sign out all devices")).toBeInTheDocument();

    expect(screen.getByText("Enter your password to confirm:")).toBeInTheDocument();

    expect(screen.getByTestId("password-input")).toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting a different radio option updates the form state.
   */
  it("updates radio group value on selection", async () => {
    // Arrange: Render the form and verify the initial hidden value.
    render(<TestWrapper />);

    expect(screen.getByTestId("radio-group-value")).toHaveValue("exclude_current");

    // Act: Locate and click the 'include_current' radio option.
    const radioItems = screen.getAllByRole("radio");
    const includeCurrentOption = radioItems.find(
      (r) => r.getAttribute("data-radio-value") === "include_current"
    );

    fireEvent.click(includeCurrentOption!);

    // Assert: Wait for the form state to reflect the new selection.
    await waitFor(() => {
      expect(screen.getByTestId("radio-group-value")).toHaveValue("include_current");
    });
  });

  /**
   * Test case to verify that typing in the password field updates the underlying form data.
   */
  it("updates password input value on typing", async () => {
    // Arrange: Render the form.
    render(<TestWrapper />);

    const passwordInput = screen.getByTestId("password-input");

    // Act: Simulate a user typing a password into the input.
    fireEvent.change(passwordInput, { target: { value: "secret123" } });

    // Assert: Verify the input value matches the entered text.
    await waitFor(() => {
      expect(passwordInput).toHaveValue("secret123");
    });
  });

  /**
   * Test case to verify that all form inputs are disabled while a sign-out operation is in progress.
   */
  it("disables inputs when isSigningOut is true", () => {
    // Arrange: Set the `isSigningOut` prop to true via the wrapper.
    render(<TestWrapper isSigningOut={true} />);

    // Assert: Confirm the radio group container and individual radio buttons are disabled.
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toHaveAttribute("data-disabled", "true");

    const radioItems = screen.getAllByRole("radio");
    radioItems.forEach((item) => {
      expect(item).toBeDisabled();
    });

    // Assert: Confirm the password input is also disabled.
    const passwordInput = screen.getByTestId("password-input");
    expect(passwordInput).toBeDisabled();
  });

  /**
   * Test case to verify that the active radio option receives specific highlight styling.
   */
  it("applies active styling to the selected option label", async () => {
    // Arrange: Render the form and identify labels.
    render(<TestWrapper />);

    const labelExclude = screen.getByText("Keep current device signed in").closest("label");
    const labelInclude = screen.getByText("Sign out all devices").closest("label");

    // Assert: Initial active state should be on the 'exclude' option.
    expect(labelExclude).toHaveClass("border-rose-400 bg-rose-50");
    expect(labelInclude).toHaveClass("border-slate-200");

    // Act: Change the selection to the 'include' option.
    const includeRadio = screen.getAllByRole("radio")[1];
    fireEvent.click(includeRadio);

    // Assert: Verify that classes have swapped to highlight the new selection.
    await waitFor(() => {
      expect(labelExclude).not.toHaveClass("border-rose-400");
      expect(labelInclude).toHaveClass("border-rose-400 bg-rose-50");
    });
  });

  /**
   * Test case to verify that labels reflect a disabled visual state during the signing-out process.
   */
  it("applies disabled styling to labels when signing out", () => {
    // Arrange: Render the form in a signing-out state.
    render(<TestWrapper isSigningOut={true} />);

    // Act: Get a reference to one of the option labels.
    const label = screen.getByText("Keep current device signed in").closest("label");

    // Assert: Confirm the presence of cursor and opacity classes for disabled items.
    expect(label).toHaveClass("cursor-not-allowed opacity-50");
  });
});
