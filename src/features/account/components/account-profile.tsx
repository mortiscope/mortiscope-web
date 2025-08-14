"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccountMutation } from "@/features/account/hooks/use-account-mutation";
import { useAccountProfile } from "@/features/account/hooks/use-account-profile";
import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import {
  sectionTitle,
  selectTriggerStyles,
  uniformInputStyles,
} from "@/features/cases/constants/styles";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import { cn } from "@/lib/utils";

/**
 * Dynamically imported location dropdown component.
 */
const LocationDropdown = dynamic(
  () => import("@/components/location-dropdown").then((module) => module.LocationDropdown),
  { ssr: false }
) as typeof import("@/components/location-dropdown").LocationDropdown;

/**
 * Framer Motion variants for the main content container.
 */
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 150,
    },
  },
};

// Form data type for account profile
type AccountProfileForm = {
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
 * The profile tab content component for the account settings page.
 */
export const AccountProfile = () => {
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
  const { updateProfile } = useAccountMutation();

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
  }, [hasLoadedInitialData, profileData, barangayList, watchedLocation, form]);

  // Button state logic
  const isNameSaveEnabled =
    !isNameLocked &&
    isFieldChanged("name") &&
    !form.formState.errors.name &&
    !updateProfile.isPending;

  const isTitleSaveEnabled = !isTitleLocked && isFieldChanged("title") && !updateProfile.isPending;

  const isInstitutionSaveEnabled =
    !isInstitutionLocked && isFieldChanged("institution") && !updateProfile.isPending;

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
      !updateProfile.isPending
  );

  // Check if location lock button should be enabled
  const isLocationLockEnabled = Boolean(
    isLocationLocked ||
      (watchedLocation?.region &&
        watchedLocation?.province &&
        watchedLocation?.city &&
        watchedLocation?.barangay)
  );

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

  // Don't render anything until all data is ready
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Profile
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          View and manage your personal information.
        </p>
      </motion.div>

      {/* Profile Form */}
      <motion.div variants={itemVariants}>
        <Form {...form}>
          <form className="mt-8 space-y-6">
            {/* Name Field */}
            <div className="w-full">
              <Label className={`${sectionTitle} font-inter`}>Name</Label>
              {!isSocialProviderLoading && (
                <div className="mt-2 flex items-start gap-2">
                  <div
                    className={cn("flex-grow", {
                      "cursor-not-allowed": isSocialUser || isNameLocked,
                    })}
                  >
                    <Input
                      placeholder="Enter Full Name"
                      className={cn(uniformInputStyles, "w-full shadow-none", {
                        "border-slate-200 disabled:opacity-100": isSocialUser || isNameLocked,
                      })}
                      disabled={isSocialUser || isNameLocked}
                      {...form.register("name")}
                    />
                  </div>
                  {!isSocialUser && (
                    <div className="flex gap-2">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                                "border-slate-200 disabled:opacity-100"
                              )}
                              onClick={handleNameLockToggle}
                              aria-label={isNameLocked ? "Unlock" : "Lock"}
                            >
                              {isNameLocked ? (
                                <HiOutlineLockClosed className="h-5 w-5" />
                              ) : (
                                <HiOutlineLockOpen className="h-5 w-5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="font-inter">
                            <p>{isNameLocked ? "Unlock" : "Lock"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className={cn({ "cursor-not-allowed": !isNameSaveEnabled })}>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                                  isNameSaveEnabled
                                    ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                    : "cursor-not-allowed border-slate-200"
                                )}
                                disabled={!isNameSaveEnabled}
                                onClick={handleNameUpdate}
                                aria-label="Save"
                              >
                                {updateProfile.isPending ? (
                                  <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                ) : (
                                  <PiFloppyDiskBack className="h-5 w-5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="font-inter">
                              <p>Save</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Professional Title Field */}
            <div className="w-full">
              <Label className={`${sectionTitle} font-inter`}>
                Professional Title or Designation
              </Label>
              <div className="mt-2 flex items-start gap-2">
                <div className={cn("flex-grow", { "cursor-not-allowed": isTitleLocked })}>
                  <Input
                    placeholder="Enter Professional Title or Designation"
                    className={cn(uniformInputStyles, "w-full shadow-none", {
                      "border-slate-200 disabled:opacity-100": isTitleLocked,
                    })}
                    disabled={isTitleLocked}
                    {...form.register("title")}
                  />
                </div>
                <div className="flex gap-2">
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                            "border-slate-200 disabled:opacity-100"
                          )}
                          onClick={handleTitleLockToggle}
                          aria-label={isTitleLocked ? "Unlock" : "Lock"}
                        >
                          {isTitleLocked ? (
                            <HiOutlineLockClosed className="h-5 w-5" />
                          ) : (
                            <HiOutlineLockOpen className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="font-inter">
                        <p>{isTitleLocked ? "Unlock" : "Lock"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className={cn({ "cursor-not-allowed": !isTitleSaveEnabled })}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                              isTitleSaveEnabled
                                ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                : "cursor-not-allowed border-slate-200"
                            )}
                            disabled={!isTitleSaveEnabled}
                            onClick={handleTitleUpdate}
                            aria-label="Save"
                          >
                            {updateProfile.isPending ? (
                              <LuLoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                              <PiFloppyDiskBack className="h-5 w-5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="font-inter">
                          <p>Save</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>

            {/* Institution Field */}
            <div className="w-full">
              <Label className={`${sectionTitle} font-inter`}>Institution or Organization</Label>
              <div className="mt-2 flex items-start gap-2">
                <div className={cn("flex-grow", { "cursor-not-allowed": isInstitutionLocked })}>
                  <Input
                    placeholder="Enter Institution or Organization"
                    className={cn(uniformInputStyles, "w-full shadow-none", {
                      "border-slate-200 disabled:opacity-100": isInstitutionLocked,
                    })}
                    disabled={isInstitutionLocked}
                    {...form.register("institution")}
                  />
                </div>
                <div className="flex gap-2">
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                            "border-slate-200 disabled:opacity-100"
                          )}
                          onClick={handleInstitutionLockToggle}
                          aria-label={isInstitutionLocked ? "Unlock" : "Lock"}
                        >
                          {isInstitutionLocked ? (
                            <HiOutlineLockClosed className="h-5 w-5" />
                          ) : (
                            <HiOutlineLockOpen className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="font-inter">
                        <p>{isInstitutionLocked ? "Unlock" : "Lock"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className={cn({ "cursor-not-allowed": !isInstitutionSaveEnabled })}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                              isInstitutionSaveEnabled
                                ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                : "cursor-not-allowed border-slate-200"
                            )}
                            disabled={!isInstitutionSaveEnabled}
                            onClick={handleInstitutionUpdate}
                            aria-label="Save"
                          >
                            {updateProfile.isPending ? (
                              <LuLoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                              <PiFloppyDiskBack className="h-5 w-5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="font-inter">
                          <p>Save</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Field */}
            <LocationDropdown
              control={form.control}
              basePath="location"
              regionList={regionList}
              provinceList={provinceList}
              cityList={cityList}
              barangayList={barangayList}
              variant="grid"
              isLocked={isLocationLocked}
              isLockEnabled={isLocationLockEnabled}
              onToggleLock={handleLocationLockToggle}
              onSaveRegion={handleLocationUpdate}
              isSaveEnabled={isLocationSaveEnabled}
              isSavePending={updateProfile.isPending}
              showLabel={true}
              labelText="Location"
              inputStyles={`${uniformInputStyles} disabled:opacity-100`}
              labelStyles={`${sectionTitle} font-inter`}
              customSelectTriggerStyles={`${selectTriggerStyles} disabled:opacity-100`}
              className="shadow-none [&_button]:border-slate-200 [&_button:disabled]:opacity-100"
            />
          </form>
        </Form>
      </motion.div>
    </motion.div>
  );
};

AccountProfile.displayName = "AccountProfile";
