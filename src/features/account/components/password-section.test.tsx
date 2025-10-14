import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordSection } from "@/features/account/components/password-section";

// Mock the password verification sub-section to verify prop drilling and callback execution.
vi.mock("@/features/account/components/password-verification-section", () => ({
  PasswordVerificationSection: ({
    isPasswordLocked,
    onPasswordVerification,
    onCurrentPasswordChange,
  }: {
    isPasswordLocked: boolean;
    onPasswordVerification: () => void;
    onCurrentPasswordChange: (value: string) => void;
  }) => (
    <div data-testid="verification-section">
      <span data-testid="verify-locked">{isPasswordLocked ? "LOCKED" : "UNLOCKED"}</span>
      <button onClick={onPasswordVerification}>Verify Action</button>
      <input data-testid="verify-input" onChange={(e) => onCurrentPasswordChange(e.target.value)} />
    </div>
  ),
}));

// Mock the password change sub-section to verify state propagation for verification and save enablement.
vi.mock("@/features/account/components/password-change-section", () => ({
  PasswordChangeSection: ({
    isPasswordVerified,
    isNewPasswordSaveEnabled,
    onPasswordUpdate,
  }: {
    isPasswordVerified: boolean;
    isNewPasswordSaveEnabled: boolean;
    onPasswordUpdate: () => void;
  }) => (
    <div data-testid="change-section">
      <span data-testid="change-verified">{isPasswordVerified ? "VERIFIED" : "UNVERIFIED"}</span>
      <span data-testid="change-save-enabled">
        {isNewPasswordSaveEnabled ? "ENABLED" : "DISABLED"}
      </span>
      <button onClick={onPasswordUpdate}>Update Action</button>
    </div>
  ),
}));

/**
 * Test suite for the `PasswordSection` component.
 */
describe("PasswordSection", () => {
  // Mock the form object required by the password sections.
  const mockForm = {
    control: {},
    formState: {},
  } as unknown as import("react-hook-form").UseFormReturn<{
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
  }>;

  // Define default properties to ensure a consistent test baseline.
  const defaultProps = {
    form: mockForm,
    isSocialUser: false,
    isSocialProviderLoading: false,
    isPasswordLocked: true,
    isPasswordVerified: false,
    isPasswordSubmitEnabled: false,
    isNewPasswordSaveEnabled: false,
    verifyPasswordIsPending: false,
    updatePasswordIsPending: false,
    newPasswordFieldsError: undefined,
    onPasswordLockToggle: vi.fn(),
    onPasswordVerification: vi.fn(),
    onPasswordUpdate: vi.fn(),
    onCurrentPasswordChange: vi.fn(),
  };

  /**
   * Test case to verify that the component yields an empty render while the social provider state is unresolved.
   */
  it("renders nothing when social provider is loading", () => {
    // Arrange: Set the `isSocialProviderLoading` prop to true.
    const { container } = render(
      <PasswordSection {...defaultProps} isSocialProviderLoading={true} />
    );

    // Assert: Confirm the DOM output is empty and child sections are not mounted.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("verification-section")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that password management sections are omitted for users authenticated via social providers.
   */
  it("renders nothing when user is a social user", () => {
    // Arrange: Set the `isSocialUser` prop to true.
    const { container } = render(<PasswordSection {...defaultProps} isSocialUser={true} />);

    // Assert: Confirm the DOM output is empty as social users do not manage passwords locally.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("change-section")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that both verification and change sections appear for standard credentials users.
   */
  it("renders both sections for a standard credentials user", () => {
    // Arrange: Render the component with default credentials props.
    render(<PasswordSection {...defaultProps} />);

    // Assert: Verify that both sub-components are successfully mounted.
    expect(screen.getByTestId("verification-section")).toBeInTheDocument();
    expect(screen.getByTestId("change-section")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `PasswordVerificationSection` receives correct state and triggers appropriate callbacks.
   */
  it("passes correct props to PasswordVerificationSection", () => {
    // Arrange: Render the component with specific lock states and callbacks.
    render(
      <PasswordSection
        {...defaultProps}
        isPasswordLocked={true}
        onPasswordVerification={defaultProps.onPasswordVerification}
      />
    );

    // Assert: Verify the initial lock state propagated to the child.
    expect(screen.getByTestId("verify-locked")).toHaveTextContent("LOCKED");

    // Act: Simulate verification action and input change.
    fireEvent.click(screen.getByText("Verify Action"));
    expect(defaultProps.onPasswordVerification).toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("verify-input"), { target: { value: "test" } });

    // Assert: Verify the change callback was executed with the correct value.
    expect(defaultProps.onCurrentPasswordChange).toHaveBeenCalledWith("test");
  });

  /**
   * Test case to verify that the `PasswordChangeSection` receives correct verification and save state props.
   */
  it("passes correct props to PasswordChangeSection", () => {
    // Arrange: Render the component with verified and enabled save states.
    render(
      <PasswordSection
        {...defaultProps}
        isPasswordVerified={true}
        isNewPasswordSaveEnabled={true}
      />
    );

    // Assert: Verify the child component reflects the verified and enabled states.
    expect(screen.getByTestId("change-verified")).toHaveTextContent("VERIFIED");
    expect(screen.getByTestId("change-save-enabled")).toHaveTextContent("ENABLED");

    // Act: Simulate the password update action.
    fireEvent.click(screen.getByText("Update Action"));

    // Assert: Confirm the update callback was triggered.
    expect(defaultProps.onPasswordUpdate).toHaveBeenCalled();
  });

  /**
   * Test case to verify that child components are correctly updated when the parent props change.
   */
  it("updates child props when parent props change", () => {
    // Arrange: Render the component in a locked state.
    const { rerender } = render(<PasswordSection {...defaultProps} isPasswordLocked={true} />);
    expect(screen.getByTestId("verify-locked")).toHaveTextContent("LOCKED");

    // Act: Rerender the component with the unlocked state.
    rerender(<PasswordSection {...defaultProps} isPasswordLocked={false} />);

    // Assert: Confirm the child component updated to reflect the new state.
    expect(screen.getByTestId("verify-locked")).toHaveTextContent("UNLOCKED");
  });
});
