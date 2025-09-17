import React from "react";
import { type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { EditCaseForm } from "@/features/cases/components/edit-case-form";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

// Interface for props expected by the mocked child components.
interface MockChildProps {
  isLocked: boolean;
  onToggleLock: () => void;
}

// Mock the dynamically imported CaseDateInput component.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<unknown>,
    options: { loading: () => React.ReactNode; ssr: boolean }
  ) => {
    if (typeof loader === "function") {
      loader();
    }
    if (options?.loading) {
      options.loading();
    }

    // Return a mock component that exposes `isLocked` state and `onToggleLock` action.
    return function MockDynamicDateInput({ isLocked, onToggleLock }: MockChildProps) {
      return (
        <div data-testid="mock-date-input" data-locked={isLocked}>
          <button onClick={onToggleLock}>Toggle Date</button>
        </div>
      );
    };
  },
}));

// Mock the `CaseNameInput` component.
vi.mock("@/features/cases/components/case-name-input", () => ({
  CaseNameInput: ({ isLocked, onToggleLock }: MockChildProps) => (
    <div data-testid="mock-name-input" data-locked={isLocked}>
      <button onClick={onToggleLock}>Toggle Name</button>
    </div>
  ),
}));

// Mock the `CaseTemperatureInput` component.
vi.mock("@/features/cases/components/case-temperature-input", () => ({
  CaseTemperatureInput: ({ isLocked, onToggleLock }: MockChildProps) => (
    <div data-testid="mock-temp-input" data-locked={isLocked}>
      <button onClick={onToggleLock}>Toggle Temp</button>
    </div>
  ),
}));

// Mock the `CaseLocationInput` component.
vi.mock("@/features/cases/components/case-location-input", () => ({
  CaseLocationInput: ({ isLocked, onToggleLock }: MockChildProps) => (
    <div data-testid="mock-location-input" data-locked={isLocked}>
      <button onClick={onToggleLock}>Toggle Location</button>
    </div>
  ),
}));

/**
 * Test suite for the `EditCaseForm` component.
 */
describe("EditCaseForm", () => {
  // Define a minimal mock form return object to satisfy the `form` prop requirement.
  const mockForm = {
    control: {},
    register: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
  } as unknown as UseFormReturn<CaseDetailsFormInput>;

  // Default state where all fields are considered locked.
  const defaultLockedState = {
    caseName: true,
    caseDate: true,
    temperature: true,
    location: true,
  };

  // Default props for the component under test.
  const defaultProps = {
    form: mockForm,
    lockedFields: defaultLockedState,
    toggleLock: vi.fn(),
    regionList: [],
    provinceList: [],
    cityList: [],
    barangayList: [],
  };

  /**
   * Test case to verify that all expected input sections (Name, Date, Temperature, Location) are rendered.
   */
  it("renders all form sections", () => {
    // Arrange: Render the component.
    render(<EditCaseForm {...defaultProps} />);

    // Assert: Check for the presence of all mocked input components via their test IDs.
    expect(screen.getByTestId("mock-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("mock-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("mock-temp-input")).toBeInTheDocument();
    expect(screen.getByTestId("mock-location-input")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `isLocked` prop is correctly mapped from the `lockedFields` object to the corresponding child components.
   */
  it("passes correct locked status to child components", () => {
    // Arrange: Define a state with mixed locked/unlocked fields.
    const mixedLockedState = {
      caseName: true,
      caseDate: false,
      temperature: true,
      location: false,
    };

    // Arrange: Render the component with the mixed state.
    render(<EditCaseForm {...defaultProps} lockedFields={mixedLockedState} />);

    // Assert: Check the `data-locked` attribute of each input matches the expected boolean state.
    expect(screen.getByTestId("mock-name-input")).toHaveAttribute("data-locked", "true");
    expect(screen.getByTestId("mock-date-input")).toHaveAttribute("data-locked", "false");
    expect(screen.getByTestId("mock-temp-input")).toHaveAttribute("data-locked", "true");
    expect(screen.getByTestId("mock-location-input")).toHaveAttribute("data-locked", "false");
  });

  /**
   * Test case to verify that clicking the lock toggle button for the Case Name field calls `toggleLock` with the correct field name.
   */
  it("calls toggleLock with correct field name for Case Name", async () => {
    // Arrange: Define a mock function for `toggleLock` and set up user events.
    const toggleLockMock = vi.fn();
    const user = userEvent.setup();
    render(<EditCaseForm {...defaultProps} toggleLock={toggleLockMock} />);

    // Act: Click the mock button that triggers the lock toggle for the name input.
    await user.click(screen.getByText("Toggle Name"));
    // Assert: Verify `toggleLock` was called with the string "caseName".
    expect(toggleLockMock).toHaveBeenCalledWith("caseName");
  });

  /**
   * Test case to verify that clicking the lock toggle button for the Case Date field calls `toggleLock` with the correct field name.
   */
  it("calls toggleLock with correct field name for Case Date", async () => {
    // Arrange: Define a mock function for `toggleLock` and set up user events.
    const toggleLockMock = vi.fn();
    const user = userEvent.setup();
    render(<EditCaseForm {...defaultProps} toggleLock={toggleLockMock} />);

    // Act: Click the mock button that triggers the lock toggle for the date input.
    await user.click(screen.getByText("Toggle Date"));
    // Assert: Verify `toggleLock` was called with the string "caseDate".
    expect(toggleLockMock).toHaveBeenCalledWith("caseDate");
  });

  /**
   * Test case to verify that clicking the lock toggle button for the Temperature field calls `toggleLock` with the correct field name.
   */
  it("calls toggleLock with correct field name for Temperature", async () => {
    // Arrange: Define a mock function for `toggleLock` and set up user events.
    const toggleLockMock = vi.fn();
    const user = userEvent.setup();
    render(<EditCaseForm {...defaultProps} toggleLock={toggleLockMock} />);

    // Act: Click the mock button that triggers the lock toggle for the temperature input.
    await user.click(screen.getByText("Toggle Temp"));
    // Assert: Verify `toggleLock` was called with the string "temperature".
    expect(toggleLockMock).toHaveBeenCalledWith("temperature");
  });

  /**
   * Test case to verify that clicking the lock toggle button for the Location field calls `toggleLock` with the correct field name.
   */
  it("calls toggleLock with correct field name for Location", async () => {
    // Arrange: Define a mock function for `toggleLock` and set up user events.
    const toggleLockMock = vi.fn();
    const user = userEvent.setup();
    render(<EditCaseForm {...defaultProps} toggleLock={toggleLockMock} />);

    // Act: Click the mock button that triggers the lock toggle for the location input.
    await user.click(screen.getByText("Toggle Location"));
    // Assert: Verify `toggleLock` was called with the string "location".
    expect(toggleLockMock).toHaveBeenCalledWith("location");
  });
});
