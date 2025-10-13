import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { AccountProfile } from "@/features/account/components/account-profile";
import { useProfileForm } from "@/features/account/hooks/use-profile-form";

// Mock the custom profile form hook to control state and form interaction logic.
vi.mock("@/features/account/hooks/use-profile-form", () => ({
  useProfileForm: vi.fn(),
}));

// Mock the tab header to verify that the profile section displays the correct title.
vi.mock("@/features/account/components/account-tab-header", () => ({
  AccountTabHeader: ({ title }: { title: string }) => <div data-testid="tab-header">{title}</div>,
}));

// Mock the generic input field component to inspect labels, values, and control visibility.
vi.mock("@/features/account/components/profile-input-field", () => ({
  ProfileInputField: ({
    label,
    value,
    onChange,
    onToggleLock,
    onSave,
    isLocked,
    isDisabled,
    showLockControls,
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    onToggleLock: () => void;
    onSave: () => void;
    isLocked: boolean;
    isDisabled?: boolean;
    showLockControls?: boolean;
  }) => (
    <div data-testid={`field-${label}`}>
      <span data-testid={`label-${label}`}>{label}</span>
      <input
        data-testid={`input-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
      />
      <span data-testid={`locked-${label}`}>{isLocked ? "LOCKED" : "UNLOCKED"}</span>
      <span data-testid={`controls-${label}`}>
        {showLockControls !== false ? "CONTROLS_VISIBLE" : "CONTROLS_HIDDEN"}
      </span>
      <button onClick={onToggleLock} data-testid={`btn-lock-${label}`}>
        Toggle Lock
      </button>
      <button onClick={onSave} data-testid={`btn-save-${label}`}>
        Save
      </button>
    </div>
  ),
}));

// Mock the location dropdown to verify regional data handling and lock states.
vi.mock("@/components/location-dropdown", () => ({
  LocationDropdown: ({
    isLocked,
    onToggleLock,
    onSaveRegion,
    labelText,
  }: {
    isLocked: boolean;
    onToggleLock: () => void;
    onSaveRegion: () => void;
    labelText: string;
  }) => (
    <div data-testid="location-dropdown">
      <span>{labelText}</span>
      <span data-testid="location-locked">{isLocked ? "LOCKED" : "UNLOCKED"}</span>
      <button onClick={onToggleLock} data-testid="btn-location-lock">
        Toggle Lock
      </button>
      <button onClick={onSaveRegion} data-testid="btn-location-save">
        Save Region
      </button>
    </div>
  ),
}));

// Mock the React Hook Form wrapper to ensure children render without complex validation logic.
vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Test suite for the `AccountProfile` component.
 */
describe("AccountProfile", () => {
  const mockSetValue = vi.fn();
  const mockWatch = vi.fn((key) => {
    const values: Record<string, string> = {
      name: "Initial Name",
      title: "Initial Title",
      institution: "Initial Institution",
    };
    return values[key];
  });

  // Define default return values for the `useProfileForm` hook to maintain test consistency.
  const defaultHookValues = {
    form: {
      watch: mockWatch,
      setValue: mockSetValue,
      control: {},
    },
    isDataReady: true,
    isSocialUser: false,
    isSocialProviderLoading: false,
    updateProfile: { isPending: false },

    isNameLocked: true,
    isTitleLocked: true,
    isInstitutionLocked: true,
    isLocationLocked: true,

    isNameSaveEnabled: false,
    isTitleSaveEnabled: false,
    isInstitutionSaveEnabled: false,
    isLocationSaveEnabled: false,
    isLocationLockEnabled: true,

    regionList: [],
    provinceList: [],
    cityList: [],
    barangayList: [],

    handleNameUpdate: vi.fn(),
    handleTitleUpdate: vi.fn(),
    handleInstitutionUpdate: vi.fn(),
    handleLocationUpdate: vi.fn(),
    handleNameLockToggle: vi.fn(),
    handleTitleLockToggle: vi.fn(),
    handleInstitutionLockToggle: vi.fn(),
    handleLocationLockToggle: vi.fn(),
  };

  // Reset all mocks and re-initialize hook return values before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    (useProfileForm as Mock).mockReturnValue(defaultHookValues);
  });

  /**
   * Test case to verify that the component renders a placeholder state when data is not yet available.
   */
  it("renders nothing when data is not ready", () => {
    // Arrange: Mock the hook to indicate that the profile data is not ready.
    (useProfileForm as Mock).mockReturnValue({ ...defaultHookValues, isDataReady: false });

    const { container } = render(<AccountProfile />);

    // Assert: Check that the form content is absent and the container is empty.
    expect(screen.queryByTestId("tab-header")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that all form sections are rendered correctly when data has loaded.
   */
  it("renders the profile form when data is ready", async () => {
    // Arrange: Render the component.
    render(<AccountProfile />);

    // Assert: Verify the header title and the presence of Name, Title, Institution, and Location fields.
    expect(screen.getByTestId("tab-header")).toHaveTextContent("Profile");

    expect(screen.getByTestId("field-Name")).toBeInTheDocument();
    expect(screen.getByTestId("field-Professional Title or Designation")).toBeInTheDocument();
    expect(screen.getByTestId("field-Institution or Organization")).toBeInTheDocument();
    expect(await screen.findByTestId("location-dropdown")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the form fields are initialized with the values provided by the hook.
   */
  it("populates fields with data from form", () => {
    // Arrange: Render the component.
    render(<AccountProfile />);

    const nameInput = screen.getByTestId("input-Name");
    const titleInput = screen.getByTestId("input-Professional Title or Designation");

    // Assert: Check that the input values match the initial mock data.
    expect(nameInput).toHaveValue("Initial Name");
    expect(titleInput).toHaveValue("Initial Title");
  });

  /**
   * Test case to verify that typing in the inputs triggers the `setValue` method for the respective form keys.
   */
  it("updates form values when inputs change", () => {
    // Arrange: Render the component.
    render(<AccountProfile />);

    // Act & Assert: Simulate changes in Name, Title, and Institution fields and verify hook interaction.
    const nameInput = screen.getByTestId("input-Name");
    fireEvent.change(nameInput, { target: { value: "MortiScope Account" } });
    expect(mockSetValue).toHaveBeenCalledWith("name", "MortiScope Account");

    const titleInput = screen.getByTestId("input-Professional Title or Designation");
    fireEvent.change(titleInput, { target: { value: "Professional Title" } });
    expect(mockSetValue).toHaveBeenCalledWith("title", "Professional Title");

    const institutionInput = screen.getByTestId("input-Institution or Organization");
    fireEvent.change(institutionInput, { target: { value: "Acme Corp" } });
    expect(mockSetValue).toHaveBeenCalledWith("institution", "Acme Corp");
  });

  /**
   * Test case to verify that clicking the lock buttons triggers the corresponding toggle handlers in the hook.
   */
  it("calls lock toggle handlers when buttons are clicked", async () => {
    // Arrange: Render the component.
    render(<AccountProfile />);

    // Act & Assert: Click toggle buttons for Name, Title, and Location and verify the hook calls.
    fireEvent.click(screen.getByTestId("btn-lock-Name"));
    expect(defaultHookValues.handleNameLockToggle).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("btn-lock-Professional Title or Designation"));
    expect(defaultHookValues.handleTitleLockToggle).toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId("btn-location-lock"));
    expect(defaultHookValues.handleLocationLockToggle).toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicking the save buttons triggers the server update handlers in the hook.
   */
  it("calls update handlers when save buttons are clicked", async () => {
    // Arrange: Render the component.
    render(<AccountProfile />);

    // Act & Assert: Click save buttons for Name, Institution, and Location and verify the hook calls.
    fireEvent.click(screen.getByTestId("btn-save-Name"));
    expect(defaultHookValues.handleNameUpdate).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("btn-save-Institution or Organization"));
    expect(defaultHookValues.handleInstitutionUpdate).toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId("btn-location-save"));
    expect(defaultHookValues.handleLocationUpdate).toHaveBeenCalled();
  });

  /**
   * Test case to verify that certain fields are restricted and controls are hidden for users authenticated via social providers.
   */
  it("handles Social User state correctly", () => {
    // Arrange: Mock the hook to indicate a social provider user.
    (useProfileForm as Mock).mockReturnValue({
      ...defaultHookValues,
      isSocialUser: true,
      isSocialProviderLoading: false,
    });

    render(<AccountProfile />);

    const nameFieldControls = screen.getByTestId("controls-Name");
    const nameInput = screen.getByTestId("input-Name");

    // Assert: Verify that the Name field is locked/disabled and controls are hidden, while other fields remain editable.
    expect(nameFieldControls).toHaveTextContent("CONTROLS_HIDDEN");
    expect(nameInput).toBeDisabled();

    expect(screen.getByTestId("controls-Professional Title or Designation")).toHaveTextContent(
      "CONTROLS_VISIBLE"
    );
  });

  /**
   * Test case to verify that the Name field is omitted while the social provider authentication is still loading.
   */
  it("hides name field if social provider is loading", () => {
    // Arrange: Mock the hook to indicate the social provider is in a loading state.
    (useProfileForm as Mock).mockReturnValue({
      ...defaultHookValues,
      isSocialProviderLoading: true,
    });

    render(<AccountProfile />);

    // Assert: Confirm that the Name field is not rendered, but other fields are.
    expect(screen.queryByTestId("field-Name")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-Professional Title or Designation")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the boolean locked states are correctly passed from the hook to child components.
   */
  it("passes locked state correctly to child components", async () => {
    // Arrange: Mock the hook with specific unlocked and locked states.
    (useProfileForm as Mock).mockReturnValue({
      ...defaultHookValues,
      isNameLocked: false,
      isLocationLocked: true,
    });

    render(<AccountProfile />);

    // Assert: Verify that children correctly reflect these specific lock states.
    expect(screen.getByTestId("locked-Name")).toHaveTextContent("UNLOCKED");
    expect(await screen.findByTestId("location-locked")).toHaveTextContent("LOCKED");
  });
});
