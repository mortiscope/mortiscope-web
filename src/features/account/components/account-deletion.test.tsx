import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountDeletion } from "@/features/account/components/account-deletion";
import { useAccountDeletion } from "@/features/account/hooks/use-account-deletion";

// Mock the custom hook to control the state of the account deletion feature.
vi.mock("@/features/account/hooks/use-account-deletion", () => ({
  useAccountDeletion: vi.fn(),
}));

// Mock the tab header component to verify the display of titles and descriptions.
vi.mock("@/features/account/components/account-tab-header", () => ({
  AccountTabHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="tab-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock the credentials-specific deletion view to test interactions for email/password users.
vi.mock("@/features/account/components/credentials-user-deletion", () => ({
  CredentialsUserDeletion: ({ onDeleteAccount }: { onDeleteAccount: () => void }) => (
    <div data-testid="credentials-deletion">
      <button onClick={onDeleteAccount}>Delete Credentials Account</button>
    </div>
  ),
}));

// Mock the social-provider-specific deletion view to test interactions for OAuth users.
vi.mock("@/features/account/components/social-provider-user-deletion", () => ({
  SocialProviderUserDeletion: ({
    onDeleteAccount,
    onDeleteLockToggle,
  }: {
    onDeleteAccount: () => void;
    onDeleteLockToggle: () => void;
  }) => (
    <div data-testid="social-deletion">
      <button onClick={onDeleteAccount}>Delete Social Account</button>
      <button onClick={onDeleteLockToggle}>Toggle Lock</button>
    </div>
  ),
}));

// Mock the confirmation modal to verify its conditional rendering based on hook state.
vi.mock("@/features/account/components/account-deletion-modal", () => ({
  AccountDeletionModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="deletion-modal">Modal Content</div> : null,
}));

/**
 * Test suite for the `AccountDeletion` component.
 */
describe("AccountDeletion", () => {
  const mockSetIsModalOpen = vi.fn();
  const mockSetIsDeleteLocked = vi.fn();
  const mockGetValues = vi.fn();

  // Define default values returned by the `useAccountDeletion` hook for standard testing.
  const defaultHookValues = {
    form: { getValues: mockGetValues },
    isDataReady: true,
    isSocialUser: false,
    isSocialProviderLoading: false,
    isPasswordLocked: true,
    showPassword: false,
    setShowPassword: vi.fn(),
    isPasswordVerified: false,
    isPasswordSubmitEnabled: false,
    isDeleteLocked: true,
    setIsDeleteLocked: mockSetIsDeleteLocked,
    isDeleteEnabled: false,
    isModalOpen: false,
    setIsModalOpen: mockSetIsModalOpen,
    verifyPassword: { isPending: false },
    handlePasswordVerification: vi.fn(),
    handlePasswordChange: vi.fn(),
    handlePasswordLockToggle: vi.fn(),
  };

  // Reset mocks and apply default hook values before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccountDeletion).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useAccountDeletion>
    );
  });

  /**
   * Test case to verify that the component returns an empty state if data is still loading.
   */
  it("renders nothing when data is not ready", () => {
    // Arrange: Mock the hook to indicate that data is not yet ready.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isDataReady: false,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    const { container } = render(<AccountDeletion />);

    // Assert: Ensure the header is missing and the container is empty.
    expect(screen.queryByTestId("tab-header")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the presence of headers and labels when data has loaded.
   */
  it("renders common elements when data is ready", () => {
    // Arrange: Render the component in its default ready state.
    render(<AccountDeletion />);

    // Assert: Check for the presence of the tab header and warning text.
    expect(screen.getByTestId("tab-header")).toBeInTheDocument();
    expect(screen.getByText("Deletion")).toBeInTheDocument();
    expect(screen.getByText(/irreversible data loss/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the credentials-specific UI is rendered for non-social users.
   */
  it("renders CredentialsUserDeletion for non-social users", () => {
    // Arrange: Render the component for a standard credentials user.
    render(<AccountDeletion />);

    // Assert: Check that the credentials UI is visible and the social UI is hidden.
    expect(screen.getByTestId("credentials-deletion")).toBeInTheDocument();
    expect(screen.queryByTestId("social-deletion")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the social-provider-specific UI is rendered for social users.
   */
  it("renders SocialProviderUserDeletion for social users", () => {
    // Arrange: Mock the hook to return a social user state.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isSocialUser: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Assert: Check that the social UI is visible and the credentials UI is hidden.
    expect(screen.getByTestId("social-deletion")).toBeInTheDocument();
    expect(screen.queryByTestId("credentials-deletion")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the delete button in the credentials UI opens the modal.
   */
  it("opens modal when delete action is triggered from credentials component", () => {
    // Arrange: Render the component.
    render(<AccountDeletion />);

    // Act: Simulate clicking the delete button within the credentials component.
    fireEvent.click(screen.getByText("Delete Credentials Account"));

    // Assert: Verify that the modal visibility state update was triggered.
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that clicking the delete button in the social UI opens the modal.
   */
  it("opens modal when delete action is triggered from social component", () => {
    // Arrange: Mock the hook for a social user state.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isSocialUser: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Act: Simulate clicking the delete button within the social component.
    fireEvent.click(screen.getByText("Delete Social Account"));

    // Assert: Verify that the modal visibility state update was triggered.
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that the deletion lock can be toggled by the social UI component.
   */
  it("toggles delete lock when triggered from social component", () => {
    // Arrange: Mock the hook for a locked social user state.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isSocialUser: true,
      isDeleteLocked: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Act: Simulate clicking the lock toggle button.
    fireEvent.click(screen.getByText("Toggle Lock"));

    // Assert: Check that the lock state change was triggered.
    expect(mockSetIsDeleteLocked).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the confirmation modal is rendered when the open state is true.
   */
  it("renders modal when isModalOpen is true", async () => {
    // Arrange: Mock the hook to return an open modal state.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isModalOpen: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Assert: Verify that the modal content is present in the document.
    expect(await screen.findByTestId("deletion-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component retrieves the password from the form for credentials users when the modal opens.
   */
  it("passes correct verified password to modal for credentials user", () => {
    // Arrange: Mock the form to return a specific password and set the modal to open.
    mockGetValues.mockReturnValue("secret-password");
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isPasswordVerified: true,
      isModalOpen: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Assert: Confirm that the component attempted to fetch the password value from the form.
    expect(mockGetValues).toHaveBeenCalledWith("password");
  });

  /**
   * Test case to verify that password retrieval is bypassed for social users as it is not required for deletion.
   */
  it("passes empty string as password to modal for social user", () => {
    // Arrange: Mock a social user with the modal open.
    vi.mocked(useAccountDeletion).mockReturnValue({
      ...defaultHookValues,
      isSocialUser: true,
      isModalOpen: true,
    } as unknown as ReturnType<typeof useAccountDeletion>);

    render(<AccountDeletion />);

    // Assert: Confirm that the form password value was never requested.
    expect(mockGetValues).not.toHaveBeenCalled();
  });
});
