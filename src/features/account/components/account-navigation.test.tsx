import { fireEvent, render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountNavigation } from "@/features/account/components/account-navigation";
import { useProfileImage } from "@/features/account/hooks/use-profile-image";

// Mock the authentication session hook to simulate different login and loading states.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock the custom profile image hook to control file uploads and optimistic updates.
vi.mock("@/features/account/hooks/use-profile-image", () => ({
  useProfileImage: vi.fn(),
}));

// Mock the avatar component to verify its inclusion in the navigation sidebars.
vi.mock("@/components/user-avatar", () => ({
  UserAvatar: ({ className }: { className?: string }) => (
    <div data-testid="user-avatar" className={className}>
      Avatar
    </div>
  ),
}));

// Mock various icon libraries to verify the visual state of navigation tabs.
vi.mock("react-icons/go", () => ({
  GoShieldCheck: () => <span data-testid="icon-security" />,
  GoVerified: () => <span data-testid="icon-verified" />,
  GoUnverified: () => <span data-testid="icon-unverified" />,
}));
vi.mock("react-icons/hi2", () => ({
  HiOutlineUserCircle: () => <span data-testid="icon-profile" />,
}));
vi.mock("react-icons/io5", () => ({
  IoImagesOutline: () => <span data-testid="icon-upload" />,
  IoTrashBinOutline: () => <span data-testid="icon-deletion" />,
}));
vi.mock("react-icons/pi", () => ({
  PiDevices: () => <span data-testid="icon-sessions" />,
  PiSealPercent: () => <span data-testid="icon-seal-percent" />,
  PiSealWarning: () => <span data-testid="icon-seal-warning" />,
}));

/**
 * Test suite for the `AccountNavigation` component.
 */
describe("AccountNavigation", () => {
  const mockOnTabChange = vi.fn();
  const defaultProps = {
    activeTab: "profile",
    onTabChange: mockOnTabChange,
  };

  const mockUser = {
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
    image: "image-1",
  };

  const mockProfileImageHook = {
    fileInputRef: { current: null },
    isUploading: false,
    isPending: false,
    selectFile: vi.fn(),
    handleFileChange: vi.fn(),
    optimisticImageUrl: null,
    clearOptimisticState: vi.fn(),
  };

  // Reset all mocks and initialize the profile image hook return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProfileImage).mockReturnValue(
      mockProfileImageHook as unknown as ReturnType<typeof useProfileImage>
    );
  });

  /**
   * Test case to verify that the component handles the loading state of the session gracefully.
   */
  it("renders nothing when session is loading", () => {
    // Arrange: Mock the session status as `loading`.
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<AccountNavigation {...defaultProps} />);

    // Assert: Confirm that nothing is rendered to the DOM.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the component remains empty when no user is logged in.
   */
  it("renders nothing when user is not authenticated", () => {
    // Arrange: Mock the session status as `unauthenticated`.
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { container } = render(<AccountNavigation {...defaultProps} />);

    // Assert: Confirm that nothing is rendered to the DOM.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the navigation interface and user details appear when a user is authenticated.
   */
  it("renders navigation tabs and user info when authenticated", () => {
    // Arrange: Mock a successful `authenticated` session.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AccountNavigation {...defaultProps} />);

    // Assert: Verify the presence of user metadata and the four main navigation tabs.
    expect(screen.getByText("Mortiscope Account")).toBeInTheDocument();
    expect(screen.getByText("mortiscope@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Deletion")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the avatar triggers the file selection logic.
   */
  it("calls selectFile when avatar container is clicked", () => {
    // Arrange: Mock an active session.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AccountNavigation {...defaultProps} />);

    // Act: Simulate a click on the wrapper element of the avatar.
    const avatarContainer = screen.getByTestId("user-avatar").parentElement;
    fireEvent.click(avatarContainer!);

    // Assert: Check that the `selectFile` method from the hook was invoked.
    expect(mockProfileImageHook.selectFile).toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicking a navigation tab triggers the tab change callback.
   */
  it("calls onTabChange when a tab is clicked", () => {
    // Arrange: Mock an active session.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AccountNavigation {...defaultProps} />);

    // Act: Simulate clicking the Security navigation tab.
    const securityTab = screen.getByText("Security").closest("button");
    fireEvent.click(securityTab!);

    // Assert: Verify that the `onTabChange` prop was called with the correct `security` key.
    expect(mockOnTabChange).toHaveBeenCalledWith("security");
  });

  /**
   * Test case to verify that the UI shows a loading spinner during an active image upload.
   */
  it("shows loading spinner when isUploading is true", () => {
    // Arrange: Mock an active session and set `isUploading` to true.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(useProfileImage).mockReturnValue({
      ...mockProfileImageHook,
      isUploading: true,
    } as unknown as ReturnType<typeof useProfileImage>);

    const { container } = render(<AccountNavigation {...defaultProps} />);

    // Assert: Confirm the presence of an animated spinner and the absence of the upload icon.
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-upload")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI prioritizes the optimistic image URL during an upload process.
   */
  it("uses optimisticImageUrl when available", () => {
    // Arrange: Mock an active session and provide an `optimisticImageUrl`.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(useProfileImage).mockReturnValue({
      ...mockProfileImageHook,
      optimisticImageUrl: "image-1",
    } as unknown as ReturnType<typeof useProfileImage>);

    render(<AccountNavigation {...defaultProps} />);

    // Assert: Verify that the avatar component is rendered with the optimistic state.
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that changing the hidden file input triggers the upload handler.
   */
  it("handles file input change", () => {
    // Arrange: Mock an active session and initialize the hook.
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    const fileInputRef = { current: null };

    vi.mocked(useProfileImage).mockReturnValue({
      ...mockProfileImageHook,
      fileInputRef,
    } as unknown as ReturnType<typeof useProfileImage>);

    const { container } = render(<AccountNavigation {...defaultProps} />);

    // Act: Locate the hidden file input and simulate a file selection.
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();

    fireEvent.change(input!, { target: { files: ["dummy-file"] } });

    // Assert: Verify that the `handleFileChange` method from the hook was invoked.
    expect(mockProfileImageHook.handleFileChange).toHaveBeenCalled();
  });
});
