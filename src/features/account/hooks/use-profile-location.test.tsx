import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { AccountProfileForm } from "@/features/account/hooks/use-profile-form";
import { useProfileLocation } from "@/features/account/hooks/use-profile-location";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";

// Mock the hook providing the Philippine address hierarchy data.
vi.mock("@/features/cases/hooks/use-philippine-address", () => ({
  usePhilippineAddress: vi.fn(),
}));

/**
 * Test suite for the `useProfileLocation` custom hook.
 */
describe("useProfileLocation", () => {
  const mockSetInitialValues = vi.fn();
  const mockIsFieldChanged = vi.fn();

  // Define static mock lists for the address hierarchy levels.
  const mockRegionList = [{ code: "01", name: "Region 1" }];
  const mockProvinceList = [{ code: "0101", name: "Province 1" }];
  const mockCityList = [{ code: "010101", name: "City 1" }];
  const mockBarangayList = [{ code: "01010101", name: "Barangay 1" }];

  // Standard profile data matching the mock lists for auto-selection tests.
  const defaultProfileData = {
    locationRegion: "Region 1",
    locationProvince: "Province 1",
    locationCity: "City 1",
    locationBarangay: "Barangay 1",
  };

  // Setup the default mock return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePhilippineAddress).mockReturnValue({
      regionList: mockRegionList,
      provinceList: mockProvinceList,
      cityList: mockCityList,
      barangayList: mockBarangayList,
      isLoading: false,
    });
  });

  /**
   * Helper function to render the hook within a React Hook Form context.
   */
  const createWrapper = () => {
    return renderHook(() => {
      const form = useForm<AccountProfileForm>({
        defaultValues: {
          location: {
            region: { code: "01", name: "Region 1" },
            province: null,
            city: null,
            barangay: null,
          },

          name: "",
          title: "",
          institution: "",
        },
      });

      const props = {
        form: form,
        profileData: defaultProfileData,
        hasLoadedInitialData: true,
        isLocationLocked: false,
        isFieldChanged: mockIsFieldChanged,
        isPending: false,
        setInitialValues: mockSetInitialValues,
      };

      return {
        hook: useProfileLocation(props),
        form,
      };
    });
  };

  /**
   * Group of tests focusing on the initial data synchronization between hooks.
   */
  describe("Initialization", () => {
    /**
     * Test case to verify that address lists are correctly consumed from the source hook.
     */
    it("returns address lists from usePhilippineAddress", () => {
      // Arrange: Render the hook.
      const { result } = createWrapper();

      // Assert: Verify all lists are present in the hook return value.
      expect(result.current.hook.regionList).toEqual(mockRegionList);
      expect(result.current.hook.provinceList).toEqual(mockProvinceList);
      expect(result.current.hook.cityList).toEqual(mockCityList);
      expect(result.current.hook.barangayList).toEqual(mockBarangayList);
    });
  });

  /**
   * Group of tests focusing on the side effects that handle cascading selections.
   */
  describe("Cascading Data Loading (Effects)", () => {
    /**
     * Test case to verify that a province is automatically selected if its name matches the profile data.
     */
    it("auto-selects province when region matches and data is loaded", () => {
      // Arrange: Render hook.
      const { result } = createWrapper();

      // Assert: Verify the province field was automatically updated.
      expect(result.current.form.getValues("location.province")).toEqual(mockProvinceList[0]);
    });

    /**
     * Test case to verify that a city is automatically selected when a valid province is present.
     */
    it("auto-selects city when province is set", () => {
      // Arrange: Render hook with province already initialized.
      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: null,
              barangay: null,
            },
          },
        });

        useProfileLocation({
          form: form,
          profileData: defaultProfileData,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });

        return form;
      });

      // Assert: Verify the city field was automatically updated.
      expect(result.current.getValues("location.city")).toEqual(mockCityList[0]);
    });

    /**
     * Test case to verify that the final level (barangay) is selected and initial values are locked in.
     */
    it("auto-selects barangay and updates initial values when city is set", () => {
      // Arrange: Render hook with city already initialized.
      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: { code: "010101", name: "City 1" },
              barangay: null,
            },
          },
        });

        useProfileLocation({
          form: form,
          profileData: defaultProfileData,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });

        return form;
      });

      // Assert: Verify barangay selection and the subsequent call to `setInitialValues`.
      expect(result.current.getValues("location.barangay")).toEqual(mockBarangayList[0]);
      expect(mockSetInitialValues).toHaveBeenCalled();
    });

    /**
     * Test case to verify that auto-selection logic is skipped if the profile data name does not match available options.
     */
    it("does NOT auto-select if names do not match profileData", () => {
      // Arrange: Provide profile data with a name not found in the mock lists.
      const mismatchedProfileData = { ...defaultProfileData, locationProvince: "Wrong Province" };

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: null,
              city: null,
              barangay: null,
            },
          },
        });

        useProfileLocation({
          form: form,
          profileData: mismatchedProfileData,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });

        return form;
      });

      // Assert: Verify the province remains null due to the mismatch.
      expect(result.current.getValues("location.province")).toBeNull();
    });

    /**
     * Test case to verify that city auto-selection is skipped if the name is missing from the list.
     */
    it("does NOT auto-select city if not found in list", () => {
      // Arrange: Provide profile data with an invalid city name.
      const profileDataWithInvalidCity = { ...defaultProfileData, locationCity: "Unknown City" };

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: null,
              barangay: null,
            },
          },
        });

        useProfileLocation({
          form: form,
          profileData: profileDataWithInvalidCity,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });

        return form;
      });

      // Assert: Verify city remains null.
      expect(result.current.getValues("location.city")).toBeNull();
    });

    /**
     * Test case to verify that barangay auto-selection is skipped if the name is missing from the list.
     */
    it("does NOT auto-select barangay if not found in list", () => {
      // Arrange: Provide profile data with an invalid barangay name.
      const profileDataWithInvalidBarangay = {
        ...defaultProfileData,
        locationBarangay: "Unknown Barangay",
      };

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: { code: "010101", name: "City 1" },
              barangay: null,
            },
          },
        });

        useProfileLocation({
          form: form,
          profileData: profileDataWithInvalidBarangay,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });

        return form;
      });

      // Assert: Verify barangay remains null.
      expect(result.current.getValues("location.barangay")).toBeNull();
    });
  });

  /**
   * Group of tests focusing on derived boolean states for UI enablement.
   */
  describe("Computed States", () => {
    /**
     * Test case to verify that the save button is enabled when the location is complete and modified.
     */
    it("enables location save when valid and changed", () => {
      // Arrange: Mock the field change detection to true.
      mockIsFieldChanged.mockReturnValue(true);

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: { code: "010101", name: "City 1" },
              barangay: { code: "01010101", name: "Barangay 1" },
            },
          },
        });

        return useProfileLocation({
          form: form,
          profileData: defaultProfileData,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });
      });

      // Assert: Verify save is enabled.
      expect(result.current.isLocationSaveEnabled).toBe(true);
    });

    /**
     * Test case to verify that the save button is disabled if the location UI is currently locked.
     */
    it("disables location save when locked", () => {
      // Arrange: Render hook with `isLocationLocked` set to true.
      mockIsFieldChanged.mockReturnValue(true);

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: { code: "010101", name: "City 1" },
              barangay: { code: "01010101", name: "Barangay 1" },
            },
          },
        });

        return useProfileLocation({
          form: form,
          profileData: defaultProfileData,
          hasLoadedInitialData: true,
          isLocationLocked: true,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });
      });

      // Assert: Verify save is disabled.
      expect(result.current.isLocationSaveEnabled).toBe(false);
    });

    /**
     * Test case to verify that the save button is disabled if required cascading fields are missing.
     */
    it("disables location save when incomplete", () => {
      // Arrange: Provide a form with null values for city and barangay.
      mockIsFieldChanged.mockReturnValue(true);

      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "01", name: "Region 1" },
              province: { code: "0101", name: "Province 1" },
              city: null,
              barangay: null,
            },
          },
        });

        return useProfileLocation({
          form: form,
          profileData: null,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });
      });

      // Assert: Verify save is disabled.
      expect(result.current.isLocationSaveEnabled).toBe(false);
    });

    /**
     * Test case to verify that the lock toggle remains enabled even with incomplete data if already locked.
     */
    it("enables location lock if incomplete but already locked", () => {
      // Arrange: Render hook in a locked state with empty location.
      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: null,
              province: null,
              city: null,
              barangay: null,
            },
          },
        });
        return useProfileLocation({
          form: form,
          profileData: null,
          hasLoadedInitialData: true,
          isLocationLocked: true,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });
      });

      // Assert: Verify lock toggle is enabled.
      expect(result.current.isLocationLockEnabled).toBe(true);
    });

    /**
     * Test case to verify that the lock toggle is enabled once a full location is selected.
     */
    it("enables location lock if complete", () => {
      // Arrange: Provide a complete location.
      const { result } = renderHook(() => {
        const form = useForm<AccountProfileForm>({
          defaultValues: {
            name: "",
            title: "",
            institution: "",
            location: {
              region: { code: "1", name: "R1" },
              province: { code: "2", name: "P1" },
              city: { code: "3", name: "C1" },
              barangay: { code: "4", name: "B1" },
            },
          },
        });

        return useProfileLocation({
          form: form,
          profileData: null,
          hasLoadedInitialData: true,
          isLocationLocked: false,
          isFieldChanged: mockIsFieldChanged,
          isPending: false,
          setInitialValues: mockSetInitialValues,
        });
      });

      // Assert: Verify lock toggle is enabled.
      expect(result.current.isLocationLockEnabled).toBe(true);
    });
  });

  /**
   * Group of tests focusing on internal utility helper methods.
   */
  describe("Helpers", () => {
    /**
     * Test case to verify finding a specific location object from a list by its name string.
     */
    it("findLocationByName returns correct item", () => {
      // Arrange: Render hook and search for a valid region name.
      const { result } = createWrapper();
      const found = result.current.hook.findLocationByName(mockRegionList, "Region 1");

      // Assert: Verify the object was found.
      expect(found).toEqual(mockRegionList[0]);
    });

    /**
     * Test case to verify that searching for a non-existent name returns null.
     */
    it("findLocationByName returns null if not found", () => {
      // Arrange: Search for an invalid name.
      const { result } = createWrapper();
      const found = result.current.hook.findLocationByName(mockRegionList, "Region 999");

      // Assert: Verify null result.
      expect(found).toBeNull();
    });

    /**
     * Test case to verify that an empty search string returns null.
     */
    it("findLocationByName returns null if name is empty", () => {
      // Arrange: Search with empty string.
      const { result } = createWrapper();
      const found = result.current.hook.findLocationByName(mockRegionList, "");

      // Assert: Verify null result.
      expect(found).toBeNull();
    });

    /**
     * Test case to verify that searching within an empty list returns null.
     */
    it("findLocationByName returns null if list is empty", () => {
      // Arrange: Search within an empty array.
      const { result } = createWrapper();
      const found = result.current.hook.findLocationByName([], "Region 1");

      // Assert: Verify null result.
      expect(found).toBeNull();
    });
  });
});
