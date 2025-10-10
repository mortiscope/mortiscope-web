import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAccountProfile } from "@/features/account/hooks/use-account-profile";
import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useProfileForm } from "@/features/account/hooks/use-profile-form";
import { useProfileLocation } from "@/features/account/hooks/use-profile-location";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";

// Mock the toast notifications library to verify user feedback triggers.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the account profile hook to control user data availability.
vi.mock("@/features/account/hooks/use-account-profile", () => ({
  useAccountProfile: vi.fn(),
}));

// Mock the form change tracking hook to simulate dirty field detection.
vi.mock("@/features/account/hooks/use-form-change", () => ({
  useFormChange: vi.fn(),
}));

// Mock the location management hook to simulate region and address logic.
vi.mock("@/features/account/hooks/use-profile-location", () => ({
  useProfileLocation: vi.fn(),
}));

// Mock the social provider hook to simulate social versus credential login states.
vi.mock("@/features/account/hooks/use-social-provider", () => ({
  useSocialProvider: vi.fn(),
}));

// Mock the update profile hook to control the submission mutation state.
vi.mock("@/features/account/hooks/use-update-profile", () => ({
  useUpdateProfile: vi.fn(),
}));

// Mock the database module to prevent actual data persistence during tests.
vi.mock("@/db", () => ({
  db: {},
}));

/**
 * Test suite for the `useProfileForm` custom hook.
 */
describe("useProfileForm", () => {
  const mockUpdateProfileMutate = vi.fn();
  const mockIsFieldChanged = vi.fn();
  const mockFindLocationByName = vi.fn();

  // Define a standard set of profile data to use as the baseline for assertions.
  const defaultProfileData = {
    name: "John Doe",
    professionalTitle: "Professional Title",
    institution: "Institution",
    locationRegion: "Region 1",
  };

  // Configure default mock behaviors before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAccountProfile).mockReturnValue({
      data: defaultProfileData,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAccountProfile>);

    vi.mocked(useSocialProvider).mockReturnValue({
      isSocialUser: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useSocialProvider>);

    vi.mocked(useUpdateProfile).mockReturnValue({
      updateProfile: {
        mutate: mockUpdateProfileMutate,
        isPending: false,
      },
    } as unknown as ReturnType<typeof useUpdateProfile>);

    vi.mocked(useFormChange).mockReturnValue({
      isFieldChanged: mockIsFieldChanged,
    } as unknown as ReturnType<typeof useFormChange>);

    vi.mocked(useProfileLocation).mockReturnValue({
      watchedLocation: {},
      regionList: [{ code: "01", name: "Region 1" }],
      provinceList: [],
      cityList: [],
      barangayList: [],
      isLocationSaveEnabled: false,
      isLocationLockEnabled: true,
      findLocationByName: mockFindLocationByName,
    } as unknown as ReturnType<typeof useProfileLocation>);

    mockFindLocationByName.mockImplementation(
      (list, name) =>
        list.find((item: { code: string; name: string }) => item.name === name) || null
    );

    mockIsFieldChanged.mockReturnValue(false);
  });

  /**
   * Test case to verify that the hook initializes fields in a locked state.
   */
  it("initializes with correct default states", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useProfileForm());

    // Assert: Check that all individual field locks are enabled by default.
    expect(result.current.isDataReady).toBe(true);
    expect(result.current.isNameLocked).toBe(true);
    expect(result.current.isTitleLocked).toBe(true);
    expect(result.current.isInstitutionLocked).toBe(true);
    expect(result.current.isLocationLocked).toBe(true);
  });

  /**
   * Test case to verify that the form internal state is updated once profile data is loaded.
   */
  it("populates form with profile data when loaded", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useProfileForm());

    // Assert: Wait for the form to synchronize with the provided `defaultProfileData`.
    await waitFor(() => {
      expect(result.current.form.getValues("name")).toBe("John Doe");
    });

    expect(result.current.form.getValues("title")).toBe("Professional Title");
    expect(result.current.form.getValues("institution")).toBe("Institution");
    expect(result.current.form.getValues("location.region")).toEqual({
      code: "01",
      name: "Region 1",
    });
  });

  /**
   * Test case to verify that missing location data is handled gracefully without errors.
   */
  it("handles null locationRegion correctly", async () => {
    // Arrange: Mock a profile where the `locationRegion` is explicitly null.
    vi.mocked(useAccountProfile).mockReturnValue({
      data: { ...defaultProfileData, locationRegion: null },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAccountProfile>);

    const { result } = renderHook(() => useProfileForm());

    // Assert: Verify that the form values reflect the null state for location.
    await waitFor(() => {
      expect(result.current.form.getValues("name")).toBe("John Doe");
    });

    expect(result.current.form.getValues("location.region")).toBeNull();
  });

  /**
   * Test case to verify that null profile fields are converted to empty strings for form compatibility.
   */
  it("handles null profile fields correctly", async () => {
    // Arrange: Mock a profile with multiple null identity fields.
    vi.mocked(useAccountProfile).mockReturnValue({
      data: {
        ...defaultProfileData,
        name: null,
        professionalTitle: null,
        institution: null,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAccountProfile>);

    const { result } = renderHook(() => useProfileForm());

    // Assert: Verify that nulls are mapped to empty strings in the `form` object.
    await waitFor(() => {
      expect(result.current.form.getValues("name")).toBe("");
      expect(result.current.form.getValues("title")).toBe("");
      expect(result.current.form.getValues("institution")).toBe("");
    });
  });

  /**
   * Test case to verify that the readiness flag is false while data is fetching.
   */
  it("handles loading states correctly", () => {
    // Arrange: Mock the profile hook in a loading state.
    vi.mocked(useAccountProfile).mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useAccountProfile>);

    const { result } = renderHook(() => useProfileForm());

    // Assert: Check that `isDataReady` reflects the loading status.
    expect(result.current.isDataReady).toBe(false);
  });

  /**
   * Test case to verify that failures in fetching profile data trigger an error notification.
   */
  it("shows error toast if profile load fails", () => {
    // Arrange: Mock an error response from the profile hook.
    vi.mocked(useAccountProfile).mockReturnValue({
      data: null,
      error: new Error("Failed"),
      isLoading: false,
    } as unknown as ReturnType<typeof useAccountProfile>);

    renderHook(() => useProfileForm());

    // Assert: Verify the `toast.error` was called with the specific error message.
    expect(toast.error).toHaveBeenCalledWith("Failed to load profile data.", expect.any(Object));
  });

  /**
   * Group of tests focusing on the logic for unlocking fields and reverting values.
   */
  describe("Field Updates and Locking", () => {
    /**
     * Test case to verify that the name field can be unlocked, edited, and reverted back to original.
     */
    it("toggles name lock and resets value on re-lock", async () => {
      // Arrange: Render hook and wait for initial data sync.
      const { result } = renderHook(() => useProfileForm());
      await waitFor(() => expect(result.current.form.getValues("name")).toBe("John Doe"));

      // Act: Unlock the name field.
      act(() => {
        result.current.handleNameLockToggle();
      });
      expect(result.current.isNameLocked).toBe(false);

      // Act: Change the value in the form.
      act(() => {
        result.current.form.setValue("name", "Jane Doe");
      });
      expect(result.current.form.getValues("name")).toBe("Jane Doe");

      // Act: Re-lock the name field.
      act(() => {
        result.current.handleNameLockToggle();
      });

      // Assert: Verify state is locked and value has reverted to `John Doe`.
      expect(result.current.isNameLocked).toBe(true);
      expect(result.current.form.getValues("name")).toBe("John Doe");
    });

    /**
     * Test case to verify that the title field correctly reverts upon re-locking.
     */
    it("toggles title lock and resets", async () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useProfileForm());
      await waitFor(() =>
        expect(result.current.form.getValues("title")).toBe("Professional Title")
      );

      // Act: Unlock, change value, then re-lock.
      act(() => result.current.handleTitleLockToggle());
      expect(result.current.isTitleLocked).toBe(false);

      act(() => result.current.form.setValue("title", "Manager"));

      act(() => result.current.handleTitleLockToggle());

      // Assert: Verify title reverted to original `Professional Title`.
      expect(result.current.isTitleLocked).toBe(true);
      expect(result.current.form.getValues("title")).toBe("Professional Title");
    });

    /**
     * Test case to verify that the institution field correctly reverts upon re-locking.
     */
    it("toggles institution lock and resets", async () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useProfileForm());
      await waitFor(() => expect(result.current.form.getValues("institution")).toBe("Institution"));

      // Act: Unlock, change value, then re-lock.
      act(() => result.current.handleInstitutionLockToggle());
      expect(result.current.isInstitutionLocked).toBe(false);

      act(() => result.current.form.setValue("institution", "New Corp"));

      act(() => result.current.handleInstitutionLockToggle());

      // Assert: Verify institution reverted to original value.
      expect(result.current.isInstitutionLocked).toBe(true);
      expect(result.current.form.getValues("institution")).toBe("Institution");
    });

    /**
     * Test case to verify the basic toggle logic for the location lock.
     */
    it("toggles location lock", async () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useProfileForm());

      // Assert: Initial state is locked.
      expect(result.current.isLocationLocked).toBe(true);

      // Act: Toggle twice.
      act(() => result.current.handleLocationLockToggle());
      expect(result.current.isLocationLocked).toBe(false);

      act(() => result.current.handleLocationLockToggle());

      // Assert: Verify final state is locked.
      expect(result.current.isLocationLocked).toBe(true);
    });

    /**
     * Test case to verify that lock toggles do not crash the hook when no initial profile data exists.
     */
    it("toggles locks safely when initialValues is not set", () => {
      // Arrange: Mock hook with no profile data.
      vi.mocked(useAccountProfile).mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      } as unknown as ReturnType<typeof useAccountProfile>);

      const { result } = renderHook(() => useProfileForm());

      // Act & Assert: Toggle locks for all identity fields and verify state changes.
      act(() => result.current.handleNameLockToggle());
      expect(result.current.isNameLocked).toBe(false);
      act(() => result.current.handleNameLockToggle());
      expect(result.current.isNameLocked).toBe(true);

      act(() => result.current.handleTitleLockToggle());
      expect(result.current.isTitleLocked).toBe(false);
      act(() => result.current.handleTitleLockToggle());
      expect(result.current.isTitleLocked).toBe(true);

      act(() => result.current.handleInstitutionLockToggle());
      expect(result.current.isInstitutionLocked).toBe(false);
      act(() => result.current.handleInstitutionLockToggle());
      expect(result.current.isInstitutionLocked).toBe(true);
    });
  });

  /**
   * Group of tests focusing on individual field submission and success handling.
   */
  describe("Saving Changes", () => {
    /**
     * Test case to verify that name updates trigger the correct mutation and success toast.
     */
    it("calls updateProfile mutation for Name", async () => {
      // Arrange: Render hook and set a new name.
      const { result } = renderHook(() => useProfileForm());

      act(() => result.current.handleNameLockToggle());
      act(() => result.current.form.setValue("name", "New Name"));

      // Act: Trigger name update.
      act(() => {
        result.current.handleNameUpdate();
      });

      // Assert: Check mutation arguments.
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { name: "New Name" },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );

      // Act: Manually trigger the onSuccess callback of the mutation.
      const successCallback = mockUpdateProfileMutate.mock.calls[0][1].onSuccess;
      act(() => {
        successCallback({ success: true });
      });

      // Assert: Verify user feedback was shown.
      expect(toast.success).toHaveBeenCalledWith(
        "Full name updated successfully.",
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that title updates trigger the correct mutation and success toast.
     */
    it("calls updateProfile mutation for Title", async () => {
      // Arrange: Render hook and set a new title.
      const { result } = renderHook(() => useProfileForm());

      act(() => result.current.handleTitleLockToggle());
      act(() => result.current.form.setValue("title", "New Title"));

      // Act: Trigger title update.
      act(() => {
        result.current.handleTitleUpdate();
      });

      // Assert: Verify mutation was called with the correct `professionalTitle` key.
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { professionalTitle: "New Title" },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );

      // Act: Simulate mutation success.
      const successCallback = mockUpdateProfileMutate.mock.calls[0][1].onSuccess;
      act(() => {
        successCallback({ success: true });
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Professional title or designated updated successfully.",
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that institution updates trigger the correct mutation and success toast.
     */
    it("calls updateProfile mutation for Institution", async () => {
      // Arrange: Render hook and set new institution.
      const { result } = renderHook(() => useProfileForm());

      act(() => result.current.handleInstitutionLockToggle());
      act(() => result.current.form.setValue("institution", "New Inst"));

      // Act: Trigger institution update.
      act(() => {
        result.current.handleInstitutionUpdate();
      });

      // Assert: Verify mutation arguments.
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { institution: "New Inst" },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );

      // Act: Simulate mutation success.
      const successCallback = mockUpdateProfileMutate.mock.calls[0][1].onSuccess;
      act(() => {
        successCallback({ success: true });
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Institution updated successfully.",
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that updating location flattens the nested location object into separate profile fields.
     */
    it("calls updateProfile mutation for Location", async () => {
      // Arrange: Render hook and populate location fields.
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.form.setValue("location", {
          region: { code: "1", name: "R1" },
          province: { code: "2", name: "P1" },
          city: { code: "3", name: "C1" },
          barangay: { code: "4", name: "B1" },
        });
      });

      // Act: Trigger location update.
      act(() => {
        result.current.handleLocationUpdate();
      });

      // Assert: Verify the mutation received the flattened data structure.
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          locationRegion: "R1",
          locationProvince: "P1",
          locationCity: "C1",
          locationBarangay: "B1",
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );

      // Act: Simulate mutation success.
      const successLocationCallback = mockUpdateProfileMutate.mock.calls[0][1].onSuccess;
      act(() => {
        successLocationCallback({ success: true });
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Location updated successfully.",
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that null location selections are converted to empty strings for storage.
     */
    it("handles saving with partial/null location data", async () => {
      // Arrange: Render hook and set all location values to null.
      const { result } = renderHook(() => useProfileForm());

      act(() => result.current.handleLocationLockToggle());

      act(() => {
        result.current.form.setValue("location", {
          region: null,
          province: null,
          city: null,
          barangay: null,
        });
      });

      // Act: Trigger update.
      act(() => result.current.handleLocationUpdate());

      // Assert: Verify the payload uses empty strings instead of nulls.
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          locationRegion: "",
          locationProvince: "",
          locationCity: "",
          locationBarangay: "",
        }),
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that no success notification is shown if the mutation response contains a failure flag.
     */
    it("handles mutation failure (success: false)", async () => {
      // Arrange: Render hook and unlock all fields.
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.handleNameLockToggle();
        result.current.handleTitleLockToggle();
        result.current.handleInstitutionLockToggle();
        result.current.handleLocationLockToggle();
      });

      // Act: Trigger updates for all categories.
      act(() => result.current.handleNameUpdate());
      act(() => result.current.handleTitleUpdate());
      act(() => result.current.handleInstitutionUpdate());
      act(() => result.current.handleLocationUpdate());

      // Act: Simulate failed responses for every mutation call.
      const successCallbackName = mockUpdateProfileMutate.mock.calls[0][1].onSuccess;
      act(() => successCallbackName({ success: false }));

      const successCallbackTitle = mockUpdateProfileMutate.mock.calls[1][1].onSuccess;
      act(() => successCallbackTitle({ success: false }));

      const successCallbackInst = mockUpdateProfileMutate.mock.calls[2][1].onSuccess;
      act(() => successCallbackInst({ success: false }));

      const successCallbackLoc = mockUpdateProfileMutate.mock.calls[3][1].onSuccess;
      act(() => successCallbackLoc({ success: false }));

      // Assert: Verify no success notifications were triggered.
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests focusing on the conditional enablement of save buttons.
   */
  describe("Save Button Enable States", () => {
    /**
     * Test case to verify that all save buttons are disabled while an update is currently processing.
     */
    it("disables buttons when update is pending", async () => {
      // Arrange: Mock the update mutation in a pending state.
      vi.mocked(useUpdateProfile).mockReturnValue({
        updateProfile: {
          mutate: mockUpdateProfileMutate,
          isPending: true,
        },
      } as unknown as ReturnType<typeof useUpdateProfile>);

      const { result, rerender } = renderHook(() => useProfileForm());

      // Act: Unlock the name field and simulate a change.
      act(() => result.current.handleNameLockToggle());
      mockIsFieldChanged.mockReturnValue(true);
      rerender();

      // Assert: Verify all save buttons remain disabled due to `isPending` status.
      expect(result.current.isNameSaveEnabled).toBe(false);
      expect(result.current.isTitleSaveEnabled).toBe(false);
      expect(result.current.isInstitutionSaveEnabled).toBe(false);
      expect(result.current.isLocationSaveEnabled).toBe(false);
    });

    /**
     * Test case to verify the complex logic for enabling the name save button.
     */
    it("enables name save button correctly", async () => {
      // Arrange: Render hook.
      const { result, rerender } = renderHook(() => useProfileForm());

      // Assert: Button should be disabled by default.
      expect(result.current.isNameSaveEnabled).toBe(false);

      // Act: Unlock the field and simulate a data change.
      act(() => result.current.handleNameLockToggle());
      mockIsFieldChanged.mockReturnValue(true);
      rerender();

      // Assert: Button should now be enabled.
      expect(result.current.isNameSaveEnabled).toBe(true);

      // Act: Introduce a validation error into the name field.
      act(() => {
        result.current.form.setError("name", { type: "required" });
      });

      // Assert: Button should be disabled again due to the form error.
      expect(result.current.isNameSaveEnabled).toBe(false);
    });
  });
});
