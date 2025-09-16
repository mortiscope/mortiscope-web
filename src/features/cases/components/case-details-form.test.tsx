import { useMutation } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { CaseDetailsForm } from "@/features/cases/components/case-details-form";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";

// Mock the database dependency.
vi.mock("@/db", () => ({ db: {} }));
// Mock the configuration dependency.
vi.mock("@/lib/config", () => ({ config: { auth: { secret: "mock-secret" } } }));

// Mock the `sonner` toast library to spy on success and error notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the server actions for case creation and update to prevent actual API calls.
vi.mock("@/features/cases/actions/create-case", () => ({ createCase: vi.fn() }));
vi.mock("@/features/cases/actions/update-case", () => ({ updateCase: vi.fn() }));

// Import the mocked server actions for use in testing mutation calls.
import { createCase } from "@/features/cases/actions/create-case";
import { updateCase } from "@/features/cases/actions/update-case";

// Mock functions from `react-hook-form` to control form behavior and inspect interactions.
const mockWatch = vi.fn();
const mockSetValue = vi.fn();
const mockReset = vi.fn();
const mockGetValues = vi.fn();
// Mock `handleSubmit` to immediately call the submission function with predefined mock data.
const mockHandleSubmit = vi.fn((fn: (data: unknown) => void) => (e?: React.BaseSyntheticEvent) => {
  e?.preventDefault?.();
  return fn({
    caseName: "Mocked Case",
    temperature: { value: 25, unit: "C" },
    location: { region: { code: "R1" } },
  });
});

// Mock the `react-hook-form` module with the controlled mock functions.
vi.mock("react-hook-form", async () => {
  const actual = await vi.importActual("react-hook-form");
  return {
    ...actual,
    useForm: () => ({
      watch: mockWatch,
      setValue: mockSetValue,
      reset: mockReset,
      handleSubmit: mockHandleSubmit,
      getValues: mockGetValues,
      control: {
        register: vi.fn(),
        unregister: vi.fn(),
        getFieldState: vi.fn(),
        _names: { mount: new Set(), unmount: new Set(), array: new Set(), watch: new Set() },
        _subjects: {
          watch: { next: vi.fn() },
          array: { next: vi.fn() },
          state: { next: vi.fn() },
        },
      },
      formState: { isValid: true, errors: {} },
    }),
    FormProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useFormContext: () => ({
      register: vi.fn(),
      control: { register: vi.fn() },
    }),
  };
});

// Mock child components to isolate the logic of `CaseDetailsForm`.
vi.mock("@/features/cases/components/case-name-input", () => ({
  CaseNameInput: () => <input data-testid="mock-name-input" />,
}));
vi.mock("@/features/cases/components/case-temperature-input", () => ({
  CaseTemperatureInput: () => <input data-testid="mock-temp-input" />,
}));
vi.mock("@/features/cases/components/case-location-input", () => ({
  CaseLocationInput: () => <div data-testid="mock-location-input" />,
}));
vi.mock("@/features/cases/components/case-date-input", () => ({
  CaseDateInput: () => <div data-testid="mock-date-input" />,
}));
vi.mock("@/features/cases/components/case-form-actions", () => ({
  CaseFormActions: ({ isSaving }: { isSaving: boolean }) => (
    <button type="submit" disabled={isSaving}>
      {isSaving ? "Saving..." : "Save Case"}
    </button>
  ),
}));
// Mock `framer-motion` to simplify rendering without animation logic.
vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

// Mock custom hooks and store dependencies.
vi.mock("@/features/analyze/store/analyze-store");
vi.mock("@/features/cases/hooks/use-philippine-address");
// Mock `react-query` to control mutation behavior and responses.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useMutation: vi.fn(),
  };
});

// Interface for the mocked store state.
interface MockStore {
  isHydrated: boolean;
  caseId: string | null;
  details: Record<string, unknown>;
  nextStep: Mock;
  prevStep: Mock;
  updateDetailsData: Mock;
  setCaseAndProceed: Mock;
  status: string;
}

// Default values for the mocked `useAnalyzeStore`.
const mockStoreValues: MockStore = {
  isHydrated: true,
  caseId: null,
  details: {},
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  updateDetailsData: vi.fn(),
  setCaseAndProceed: vi.fn(),
  status: "idle",
};

// Default values for the mocked `usePhilippineAddress` hook.
const mockAddressHookValues = {
  regionList: [],
  provinceList: [],
  cityList: [],
  barangayList: [],
  isLoading: false,
};

/**
 * Test suite for the `CaseDetailsForm` component.
 */
describe("CaseDetailsForm", () => {
  // Mocks for the `mutate` function returned by `useMutation` for creation and update actions.
  const mutateCreateMock = vi.fn();
  const mutateUpdateMock = vi.fn();

  beforeEach(() => {
    // Arrange: Reset all mocks before each test to ensure test independence.
    vi.clearAllMocks();

    // Arrange: Default mock returns for `react-hook-form` state.
    mockWatch.mockReturnValue(undefined);
    mockGetValues.mockReturnValue(undefined);

    // Arrange: Set up mock return values for the component's dependencies.
    vi.mocked(useAnalyzeStore).mockReturnValue(
      mockStoreValues as unknown as ReturnType<typeof useAnalyzeStore>
    );
    vi.mocked(usePhilippineAddress).mockReturnValue(
      mockAddressHookValues as unknown as ReturnType<typeof usePhilippineAddress>
    );

    // Arrange: Implement a mock for `useMutation` that returns the appropriate `mutate` function based on the action being mocked.
    vi.mocked(useMutation).mockImplementation(((options: { mutationFn: unknown }) => {
      return {
        mutate: options?.mutationFn === updateCase ? mutateUpdateMock : mutateCreateMock,
        isPending: false,
      };
    }) as unknown as typeof useMutation);
  });

  /**
   * Test case to verify that the form renders when the store state indicates it is hydrated.
   */
  it("renders the form when hydrated", () => {
    // Arrange: Render the component.
    render(<CaseDetailsForm />);
    // Assert: Check for the presence of the form title.
    expect(screen.getByText("Case Details")).toBeInTheDocument();
  });

  /**
   * Test case to verify that `useMutation` is called twice to set up both create and update mutations.
   */
  it("initializes mutation logic", () => {
    // Arrange: Render the component.
    render(<CaseDetailsForm />);
    // Assert: Check that `useMutation` was called to initialize the `createCase` mutation.
    expect(useMutation).toHaveBeenCalledWith(expect.objectContaining({ mutationFn: createCase }));
    // Assert: Check that `useMutation` was called to initialize the `updateCase` mutation.
    expect(useMutation).toHaveBeenCalledWith(expect.objectContaining({ mutationFn: updateCase }));
  });

  /**
   * Test case to verify that `createCase` mutation is called when submitting the form and no `caseId` is present.
   */
  it("submits new case data when caseId is null", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<CaseDetailsForm />);

    // Act: Click the mock submit button.
    await user.click(screen.getByRole("button", { name: "Save Case" }));

    // Assert: Check that the `mutateCreateMock` function was called with the mock form data.
    expect(mutateCreateMock).toHaveBeenCalledWith({
      caseName: "Mocked Case",
      temperature: { value: 25, unit: "C" },
      location: { region: { code: "R1" } },
    });
  });

  /**
   * Test case to verify that `updateCase` mutation is called when submitting the form and a `caseId` is present.
   */
  it("submits update when caseId is present", async () => {
    // Arrange: Mock the store to return a specific `caseId`.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...mockStoreValues,
      caseId: "123",
    } as unknown as ReturnType<typeof useAnalyzeStore>);
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<CaseDetailsForm />);

    // Act: Click the mock submit button.
    await user.click(screen.getByRole("button", { name: "Save Case" }));

    // Assert: Check that the `mutateUpdateMock` function was called with the `caseId` and the form details.
    expect(mutateUpdateMock).toHaveBeenCalledWith({
      caseId: "123",
      details: expect.objectContaining({
        caseName: "Mocked Case",
      }),
    });
  });

  // Helper function to set up the context for address synchronization tests.
  const setupAddressSyncTest = (
    field: "region" | "province" | "city" | "barangay",
    listName: "regionList" | "provinceList" | "cityList" | "barangayList",
    listData: Array<{ code: string; name: string }>,
    persistedName: string
  ) => {
    // Arrange: Set up the mock store details with a mismatched location name.
    const location: Record<string, { code: string; name: string }> = {};
    location[field] = { code: "CODE_1", name: persistedName };

    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...mockStoreValues,
      details: { location },
    } as unknown as ReturnType<typeof useAnalyzeStore>);

    // Arrange: Set up the mock address hook data with the corrected name for the code.
    const hookData = { ...mockAddressHookValues, [listName]: listData };
    vi.mocked(usePhilippineAddress).mockReturnValue(
      hookData as unknown as ReturnType<typeof usePhilippineAddress>
    );

    // Arrange: Mock `getValues` to return a different code/value from the form's perspective, triggering the sync.
    mockGetValues.mockImplementation((key) => {
      if (key === `location.${field}`) return { code: "DIFFERENT_CODE" };
      return undefined;
    });

    // Act: Render the component, triggering the synchronization effect.
    render(<CaseDetailsForm />);
  };

  /**
   * Test case to verify that the form value for the Region is updated if the form's value differs from the persisted value in the store.
   */
  it("syncs Region when values differ", () => {
    // Arrange: Set up test context for region sync.
    setupAddressSyncTest(
      "region",
      "regionList",
      [{ code: "CODE_1", name: "Region 1" }],
      "Region 1"
    );
    // Assert: Check that `setValue` was called to update the `location.region` field with the corrected value.
    expect(mockSetValue).toHaveBeenCalledWith(
      "location.region",
      { code: "CODE_1", name: "Region 1" },
      { shouldValidate: true }
    );
  });

  /**
   * Test case to verify that the form value for the Province is updated if the form's value differs from the persisted value in the store.
   */
  it("syncs Province when values differ", () => {
    // Arrange: Set up test context for province sync.
    setupAddressSyncTest(
      "province",
      "provinceList",
      [{ code: "CODE_1", name: "Province 1" }],
      "Province 1"
    );
    // Assert: Check that `setValue` was called to update the `location.province` field.
    expect(mockSetValue).toHaveBeenCalledWith(
      "location.province",
      { code: "CODE_1", name: "Province 1" },
      { shouldValidate: true }
    );
  });

  /**
   * Test case to verify that the form value for the City is updated if the form's value differs from the persisted value in the store.
   */
  it("syncs City when values differ", () => {
    // Arrange: Set up test context for city sync.
    setupAddressSyncTest("city", "cityList", [{ code: "CODE_1", name: "City 1" }], "City 1");
    // Assert: Check that `setValue` was called to update the `location.city` field.
    expect(mockSetValue).toHaveBeenCalledWith(
      "location.city",
      { code: "CODE_1", name: "City 1" },
      { shouldValidate: true }
    );
  });

  /**
   * Test case to verify that the form value for the Barangay is updated if the form's value differs from the persisted value in the store.
   */
  it("syncs Barangay when values differ", () => {
    // Arrange: Set up test context for barangay sync.
    setupAddressSyncTest(
      "barangay",
      "barangayList",
      [{ code: "CODE_1", name: "Barangay 1" }],
      "Barangay 1"
    );
    // Assert: Check that `setValue` was called to update the `location.barangay` field.
    expect(mockSetValue).toHaveBeenCalledWith(
      "location.barangay",
      { code: "CODE_1", name: "Barangay 1" },
      { shouldValidate: true }
    );
  });

  /**
   * Test case to verify success handling after a new case creation (mutation success).
   */
  it("handles Create Success", () => {
    // Arrange: Render the component to initialize mutations.
    render(<CaseDetailsForm />);
    // Arrange: Find the options for the `createCase` mutation.
    const calls = vi.mocked(useMutation).mock.calls;
    const createCall = calls.find(
      (c) => (c[0] as { mutationFn: unknown }).mutationFn === createCase
    );
    const options = createCall![0] as { onSuccess: (data: unknown, variables: unknown) => void };

    // Act: Manually call the `onSuccess` handler with mock success data.
    options.onSuccess({ success: true, data: { caseId: "NEW_ID" } }, { some: "vars" });

    // Assert: Check that a success toast notification was triggered.
    expect(toast.success).toHaveBeenCalledWith("Case details have been saved.");
    // Assert: Check that the store was updated with the new `caseId` and proceeded to the next step.
    expect(mockStoreValues.setCaseAndProceed).toHaveBeenCalledWith("NEW_ID");
  });

  /**
   * Test case to verify error handling when the server action returns `success: false` during case creation.
   */
  it("handles Create Error (Success=false)", () => {
    // Arrange: Render the component to initialize mutations.
    render(<CaseDetailsForm />);
    // Arrange: Find the options for the `createCase` mutation.
    const calls = vi.mocked(useMutation).mock.calls;
    const createCall = calls.find(
      (c) => (c[0] as { mutationFn: unknown }).mutationFn === createCase
    );
    const options = createCall![0] as { onSuccess: (data: unknown, variables: unknown) => void };

    // Act: Manually call the `onSuccess` handler with mock failure data.
    options.onSuccess({ success: false, error: "Logic Fail" }, {});
    // Assert: Check that an error toast notification was triggered with the specified error message.
    expect(toast.error).toHaveBeenCalledWith("Logic Fail");
  });

  /**
   * Test case to verify success handling after a case update (mutation success).
   */
  it("handles Update Success", () => {
    // Arrange: Render the component to initialize mutations.
    render(<CaseDetailsForm />);
    // Arrange: Find the options for the `updateCase` mutation.
    const calls = vi.mocked(useMutation).mock.calls;
    const updateCall = calls.find(
      (c) => (c[0] as { mutationFn: unknown }).mutationFn === updateCase
    );
    const options = updateCall![0] as { onSuccess: (data: unknown, variables: unknown) => void };

    // Act: Manually call the `onSuccess` handler with mock success data and variables containing the details.
    options.onSuccess({ success: true }, { details: { foo: "bar" } });

    // Assert: Check that the store's details data was updated with the submitted form data.
    expect(mockStoreValues.updateDetailsData).toHaveBeenCalledWith({ foo: "bar" });
    // Assert: Check that a success toast notification was triggered.
    expect(toast.success).toHaveBeenCalledWith("Case details have been updated.");
    // Assert: Check that the store proceeded to the next step in the analysis flow.
    expect(mockStoreValues.nextStep).toHaveBeenCalled();
  });

  /**
   * Test case to verify error handling when the server action returns `success: false` during case update.
   */
  it("handles Update Error (Success=false)", () => {
    // Arrange: Render the component to initialize mutations.
    render(<CaseDetailsForm />);
    // Arrange: Find the options for the `updateCase` mutation.
    const calls = vi.mocked(useMutation).mock.calls;
    const updateCall = calls.find(
      (c) => (c[0] as { mutationFn: unknown }).mutationFn === updateCase
    );
    const options = updateCall![0] as { onSuccess: (data: unknown, variables: unknown) => void };

    // Act: Manually call the `onSuccess` handler with mock failure data.
    options.onSuccess({ success: false, error: "Update Fail" }, {});
    // Assert: Check that an error toast notification was triggered with the specified error message.
    expect(toast.error).toHaveBeenCalledWith("Update Fail");
  });
});
