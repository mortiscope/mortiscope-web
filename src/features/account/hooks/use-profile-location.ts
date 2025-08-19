"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { AccountProfileForm } from "@/features/account/hooks/use-profile-form";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";

type ProfileData = {
  locationRegion: string | null;
  locationProvince: string | null;
  locationCity: string | null;
  locationBarangay: string | null;
} | null;

type UseProfileLocationProps = {
  form: UseFormReturn<AccountProfileForm>;
  profileData: ProfileData;
  hasLoadedInitialData: boolean;
  isLocationLocked: boolean;
  isFieldChanged: (fieldName: keyof AccountProfileForm) => boolean;
  isPending: boolean;
  setInitialValues: (values: AccountProfileForm) => void;
};

/**
 * A custom hook that manages Philippine location data loading and validation for the profile form.
 * @param props Configuration object containing form, profile data, and state flags
 * @returns Location lists, computed states, and helper functions
 */
export function useProfileLocation({
  form,
  profileData,
  hasLoadedInitialData,
  isLocationLocked,
  isFieldChanged,
  isPending,
  setInitialValues,
}: UseProfileLocationProps) {
  // Watch location values for Philippine address hook
  const watchedLocation = form.watch("location");
  const { regionList, provinceList, cityList, barangayList } = usePhilippineAddress({
    regionCode: watchedLocation?.region?.code,
    provinceCode: watchedLocation?.province?.code,
    cityCode: watchedLocation?.city?.code,
  });

  // Helper function to find location by name
  const findLocationByName = (list: { code: string; name: string }[], name: string) => {
    if (!name || !list.length) return null;
    return list.find((item) => item.name === name) || null;
  };

  // Load province when province list is available
  useEffect(() => {
    if (
      hasLoadedInitialData &&
      profileData?.locationProvince &&
      provinceList.length > 0 &&
      watchedLocation?.region &&
      !watchedLocation?.province
    ) {
      const province = findLocationByName(provinceList, profileData.locationProvince);
      if (province) {
        form.setValue("location.province", province);
      }
    }
  }, [hasLoadedInitialData, profileData, provinceList, watchedLocation, form]);

  // Load city when city list is available
  useEffect(() => {
    if (
      hasLoadedInitialData &&
      profileData?.locationCity &&
      cityList.length > 0 &&
      watchedLocation?.province &&
      !watchedLocation?.city
    ) {
      const city = findLocationByName(cityList, profileData.locationCity);
      if (city) {
        form.setValue("location.city", city);
      }
    }
  }, [hasLoadedInitialData, profileData, cityList, watchedLocation, form]);

  // Load barangay when barangay list is available
  useEffect(() => {
    if (
      hasLoadedInitialData &&
      profileData?.locationBarangay &&
      barangayList.length > 0 &&
      watchedLocation?.city &&
      !watchedLocation?.barangay
    ) {
      const barangay = findLocationByName(barangayList, profileData.locationBarangay);
      if (barangay) {
        form.setValue("location.barangay", barangay);
        // Update initial values once all location data is loaded
        const currentValues = form.getValues();
        setInitialValues(currentValues);
      }
    }
  }, [hasLoadedInitialData, profileData, barangayList, watchedLocation, form, setInitialValues]);

  // Compute location save enabled state
  const isLocationSaveEnabled = Boolean(
    !isLocationLocked &&
      watchedLocation?.region &&
      watchedLocation?.province &&
      watchedLocation?.city &&
      watchedLocation?.barangay &&
      (isFieldChanged("location") ||
        // Also check if any location part has changed from the original profile data
        (profileData &&
          (watchedLocation?.region?.name !== profileData.locationRegion ||
            watchedLocation?.province?.name !== profileData.locationProvince ||
            watchedLocation?.city?.name !== profileData.locationCity ||
            watchedLocation?.barangay?.name !== profileData.locationBarangay))) &&
      !isPending
  );

  // Check if location lock button should be enabled
  const isLocationLockEnabled = Boolean(
    isLocationLocked ||
      (watchedLocation?.region &&
        watchedLocation?.province &&
        watchedLocation?.city &&
        watchedLocation?.barangay)
  );

  return {
    // Location data
    watchedLocation,
    regionList,
    provinceList,
    cityList,
    barangayList,

    // Computed states
    isLocationSaveEnabled,
    isLocationLockEnabled,

    // Helper functions
    findLocationByName,
  };
}
