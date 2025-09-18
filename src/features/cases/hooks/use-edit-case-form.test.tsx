import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { updateCase } from "@/features/cases/actions/update-case";
import { useEditCaseForm } from "@/features/cases/hooks/use-edit-case-form";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import { type CaseWithRelations } from "@/features/results/components/results-view";
import { useResultsStore } from "@/features/results/store/results-store";

// Mock the server action responsible for updating the case details in the database.
vi.mock("@/features/cases/actions/update-case", () => ({
  updateCase: vi.fn(),
}));

// Mock the hook that provides Philippine address data and cascading logic.
vi.mock("@/features/cases/hooks/use-philippine-address");

// Mock the global state store for results management.
vi.mock("@/features/results/store/results-store", () => ({
  useResultsStore: vi.fn(),
}));

// Mock the toast notification library.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Utility function to create a wrapper component for React Query setup.
const createWrapper = () => {
  // Arrange: Initialize a new `QueryClient` instance.
  const queryClient = new QueryClient({
    defaultOptions: {
      // Disable retries for all queries and mutations to simplify testing.
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Arrange: Define the wrapper component to provide the `QueryClientProvider` context.
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return QueryWrapper;
};

// Define mock data representing the existing case being edited.
const mockCaseData = {
  id: "case-123",
  caseName: "Test Case",
  caseDate: new Date("2025-01-01"),
  temperatureCelsius: 25,
  locationRegion: "Region 1",
  locationProvince: "Province A",
  locationCity: "City B",
  locationBarangay: "Barangay C",
  notes: "Some notes",
} as unknown as CaseWithRelations;

// Define mock data returned by the `usePhilippineAddress` hook.
const mockAddressData = {
  isLoading: false,
  regionList: [{ code: "R1", name: "Region 1" }],
  provinceList: [{ code: "P1", name: "Province A" }],
  cityList: [{ code: "C1", name: "City B" }],
  barangayList: [{ code: "B1", name: "Barangay C" }],
};

/**
 * Test suite for the `useEditCaseForm` hook.
 */
describe("useEditCaseForm", () => {
  // Mock function for triggering case recalculation in the global store.
  const markForRecalculationMock = vi.fn();
  // Mock function passed as a prop to close the editing sheet/modal.
  const onSheetCloseMock = vi.fn();

  // Setup runs before each test.
  beforeEach(() => {
    // Arrange: Clear execution history of all spies and mocks.
    vi.clearAllMocks();

    // Arrange: Mock `useResultsStore` to return the `markForRecalculation` action.
    vi.mocked(useResultsStore).mockImplementation((selector: unknown) => {
      const state = { markForRecalculation: markForRecalculationMock };
      return (selector as (s: typeof state) => unknown)(state);
    });

    // Arrange: Mock `usePhilippineAddress` to return predefined address lists.
    vi.mocked(usePhilippineAddress).mockReturnValue(mockAddressData);
  });

  /**
   * Test case to verify that the form fields are correctly initialized with the provided `caseData`.
   */
  it("initializes form with case data", async () => {
    // Act: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Assert: Wait for the address initialization side-effect to complete before checking values.
    await waitFor(() => {
      expect(result.current.form.getValues().location.barangay?.code).toBe("B1");
    });

    // Assert: Check non-address fields for correct initialization.
    const values = result.current.form.getValues();
    expect(values.caseName).toBe("Test Case");
    expect(values.temperature.value).toBe(25);
    expect(values.notes).toBe("Some notes");
  });

  /**
   * Test case to verify that the cascading address fields are correctly mapped and populated from string data in `caseData`.
   */
  it("auto-populates cascading address fields on mount", async () => {
    // Act: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Assert: Wait for all address fields to be populated by their respective mock codes.
    await waitFor(() => {
      const values = result.current.form.getValues();
      expect(values.location.region?.code).toBe("R1");
      expect(values.location.province?.code).toBe("P1");
      expect(values.location.city?.code).toBe("C1");
      expect(values.location.barangay?.code).toBe("B1");
    });
  });

  /**
   * Test case to verify that the field lock status can be toggled via the returned function.
   */
  it("toggles field locks correctly", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Arrange: Wait for initialization to complete.
    await waitFor(() => {
      expect(result.current.form.getValues().location.barangay?.code).toBe("B1");
    });

    // Assert: Check the initial locked state for a specific field.
    expect(result.current.lockedFields.caseName).toBe(true);

    // Act: Toggle the lock state for `caseName`.
    act(() => {
      result.current.toggleLock("caseName");
    });

    // Assert: Verify that the lock state has changed to false.
    expect(result.current.lockedFields.caseName).toBe(false);
  });

  /**
   * Test case to verify successful submission, including server action call, recalculation trigger, and UI closure.
   */
  it("submits data and handles success correctly", async () => {
    // Arrange: Mock the `updateCase` server action to resolve successfully and trigger recalculation.
    vi.mocked(updateCase).mockResolvedValue({
      success: true,
      recalculationTriggered: true,
    } as unknown as Awaited<ReturnType<typeof updateCase>>);

    // Arrange: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Arrange: Wait for initialization.
    await waitFor(() => {
      expect(result.current.form.getValues().location.barangay?.code).toBe("B1");
    });

    // Act: Manually set a form value to make the form dirty and ready for submission.
    act(() => {
      result.current.form.setValue("caseName", "Updated Name", {
        shouldDirty: true,
        shouldValidate: true,
      });
    });

    // Act: Submit the form asynchronously.
    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    // Assert: Check that the server action was called with the correct `caseId` and updated data.
    expect(updateCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-123",
        details: expect.objectContaining({ caseName: "Updated Name" }),
      })
    );

    // Assert: Check that the store action to trigger recalculation was called.
    expect(markForRecalculationMock).toHaveBeenCalledWith("case-123");
    // Assert: Check that a success toast was displayed to the user.
    expect(toast.success).toHaveBeenCalled();
    // Assert: Check that the sheet closure function was called.
    expect(onSheetCloseMock).toHaveBeenCalled();
  });

  /**
   * Test case to verify that submission failures are handled by displaying an error toast and preventing UI closure.
   */
  it("handles submission errors", async () => {
    // Arrange: Mock the `updateCase` server action to resolve with a failure status and an error message.
    vi.mocked(updateCase).mockResolvedValue({
      success: false,
      error: "Update failed",
    } as unknown as Awaited<ReturnType<typeof updateCase>>);

    // Arrange: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Arrange: Wait for initialization.
    await waitFor(() => {
      expect(result.current.form.getValues().location.barangay?.code).toBe("B1");
    });

    // Act: Manually set a form value to make the form dirty.
    act(() => {
      result.current.form.setValue("caseName", "New", { shouldDirty: true });
    });

    // Act: Submit the form asynchronously.
    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    // Assert: Check that an error toast was displayed with the failure message.
    expect(toast.error).toHaveBeenCalledWith("Update failed");
    // Assert: Check that the sheet closure function was NOT called.
    expect(onSheetCloseMock).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the logic that controls the submission button's disabled state.
   */
  it("disables submit button if form is invalid or untouched", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(
      () => useEditCaseForm({ caseData: mockCaseData, onSheetClose: onSheetCloseMock }),
      { wrapper: createWrapper() }
    );

    // Arrange: Wait for initialization.
    await waitFor(() => {
      expect(result.current.form.getValues().location.barangay?.code).toBe("B1");
    });

    // Assert: Check that the button is initially disabled because the form is clean (not dirty).
    expect(result.current.isButtonDisabled).toBe(true);

    // Act: Attempt to make the form dirty and invalid by setting an empty string for a required field.
    act(() => {
      result.current.form.setValue("caseName", "", { shouldDirty: true, shouldValidate: true });
    });

    // Assert: Wait for the form validation state to update and check that the button remains disabled.
    await waitFor(() => {
      expect(result.current.isButtonDisabled).toBe(true);
    });
  });
});
