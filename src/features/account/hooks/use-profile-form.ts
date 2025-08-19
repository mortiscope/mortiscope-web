"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAccountProfile } from "@/features/account/hooks/use-account-profile";
import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useProfileLocation } from "@/features/account/hooks/use-profile-location";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";

// Form data type for account profile
export type AccountProfileForm = {
  name: string;
  title: string;
  institution: string;
  location: {
    region: { code: string; name: string } | null;
    province: { code: string; name: string } | null;
    city: { code: string; name: string } | null;
    barangay: { code: string; name: string } | null;
  };
};

/**
 * A custom hook that manages the profile form state, data loading, and mutations.
 * @returns An object containing form state, handlers, and computed values.
 */
export function useProfileForm() {
  const [isNameLocked, setIsNameLocked] = useState(true);
  const [isTitleLocked, setIsTitleLocked] = useState(true);
  const [isInstitutionLocked, setIsInstitutionLocked] = useState(true);
  const [isLocationLocked, setIsLocationLocked] = useState(true);

  // Fetch profile data
  const { data: profileData, error, isLoading: isProfileLoading } = useAccountProfile();

  // Check if user is using social providers
  const { isSocialUser, isLoading: isSocialProviderLoading } = useSocialProvider();

  // Wait for all data to be ready before showing animations
  const isDataReady = !isProfileLoading && !isSocialProviderLoading;

  // Account mutations
  const { updateProfile } = useUpdateProfile();

  // Form setup
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

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState<AccountProfileForm | null>(null);

  // Track if we've already loaded the initial data to prevent loops
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Form change detection
  const { isFieldChanged } = useFormChange(form, initialValues);

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load profile data.", {
        className: "font-inter",
      });
    }
  }, [error]);

  // Location management
  const {
    watchedLocation,
    regionList,
    provinceList,
    cityList,
    barangayList,
    isLocationSaveEnabled: computedLocationSaveEnabled,
    isLocationLockEnabled: computedLocationLockEnabled,
    findLocationByName,
  } = useProfileLocation({
    form,
    profileData,
    hasLoadedInitialData,
    isLocationLocked,
    isFieldChanged,
    isPending: updateProfile.isPending,
    setInitialValues,
  });

  // Load basic profile data and find region
  useEffect(() => {
    if (profileData && regionList.length > 0 && !hasLoadedInitialData) {
      const region = profileData.locationRegion
        ? findLocationByName(regionList, profileData.locationRegion)
        : null;

      const formData = {
        name: profileData.name || "",
        title: profileData.professionalTitle || "",
        institution: profileData.institution || "",
        location: {
          region,
          province: null,
          city: null,
          barangay: null,
        },
      };

      form.reset(formData);
      setInitialValues(formData);
      setHasLoadedInitialData(true);
    }
  }, [profileData, regionList, hasLoadedInitialData, form]);

  // Button state logic
  const isNameSaveEnabled =
    !isNameLocked &&
    isFieldChanged("name") &&
    !form.formState.errors.name &&
    !updateProfile.isPending;

  const isTitleSaveEnabled = !isTitleLocked && isFieldChanged("title") && !updateProfile.isPending;

  const isInstitutionSaveEnabled =
    !isInstitutionLocked && isFieldChanged("institution") && !updateProfile.isPending;

  // Use computed location states from the location hook
  const isLocationSaveEnabled = computedLocationSaveEnabled;
  const isLocationLockEnabled = computedLocationLockEnabled;

  // Handle individual field updates
  const handleNameUpdate = () => {
    const name = form.getValues("name");
    updateProfile.mutate(
      { name },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success("Full name updated successfully.", {
              className: "font-inter",
            });
          }
        },
      }
    );
  };

  const handleTitleUpdate = () => {
    const professionalTitle = form.getValues("title");
    updateProfile.mutate(
      { professionalTitle },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success("Professional title or designated updated successfully.", {
              className: "font-inter",
            });
          }
        },
      }
    );
  };

  const handleInstitutionUpdate = () => {
    const institution = form.getValues("institution");
    updateProfile.mutate(
      { institution },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success("Institution updated successfully.", {
              className: "font-inter",
            });
          }
        },
      }
    );
  };

  const handleLocationUpdate = () => {
    const location = form.getValues("location");
    updateProfile.mutate(
      {
        locationRegion: location.region?.name || "",
        locationProvince: location.province?.name || "",
        locationCity: location.city?.name || "",
        locationBarangay: location.barangay?.name || "",
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success("Location updated successfully.", {
              className: "font-inter",
            });
          }
        },
      }
    );
  };

  // Handle lock/unlock with field reset
  const handleNameLockToggle = () => {
    if (!isNameLocked) {
      // If locking, reset to original value
      if (initialValues) {
        form.setValue("name", initialValues.name);
        form.clearErrors("name");
      }
    }
    setIsNameLocked(!isNameLocked);
  };

  const handleTitleLockToggle = () => {
    if (!isTitleLocked) {
      // If locking, reset to original value
      if (initialValues) {
        form.setValue("title", initialValues.title);
        form.clearErrors("title");
      }
    }
    setIsTitleLocked(!isTitleLocked);
  };

  const handleInstitutionLockToggle = () => {
    if (!isInstitutionLocked) {
      // If locking, reset to original value
      if (initialValues) {
        form.setValue("institution", initialValues.institution);
        form.clearErrors("institution");
      }
    }
    setIsInstitutionLocked(!isInstitutionLocked);
  };

  const handleLocationLockToggle = () => {
    setIsLocationLocked(!isLocationLocked);
  };

  return {
    // Form state
    form,
    isDataReady,
    isSocialUser,
    isSocialProviderLoading,
    updateProfile,

    // Lock states
    isNameLocked,
    isTitleLocked,
    isInstitutionLocked,
    isLocationLocked,

    // Button states
    isNameSaveEnabled,
    isTitleSaveEnabled,
    isInstitutionSaveEnabled,
    isLocationSaveEnabled,
    isLocationLockEnabled,

    // Location data
    watchedLocation,
    regionList,
    provinceList,
    cityList,
    barangayList,

    // Handlers
    handleNameUpdate,
    handleTitleUpdate,
    handleInstitutionUpdate,
    handleLocationUpdate,
    handleNameLockToggle,
    handleTitleLockToggle,
    handleInstitutionLockToggle,
    handleLocationLockToggle,
  };
}
