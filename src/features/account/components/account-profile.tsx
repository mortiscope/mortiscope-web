"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";

import { Form } from "@/components/ui/form";
import { AccountTabHeader } from "@/features/account/components/account-tab-header";
import { ProfileField } from "@/features/account/components/profile-field";
import { useProfileForm } from "@/features/account/hooks/use-profile-form";
import { selectTriggerStyles, uniformInputStyles } from "@/features/cases/constants/styles";

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

/**
 * The profile tab content component for the account settings page.
 */
export const AccountProfile = () => {
  const {
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
  } = useProfileForm();

  // Don't render anything until all data is ready
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Profile Header */}
      <AccountTabHeader title="Profile" description="View and manage your personal information." />

      {/* Profile Form */}
      <motion.div variants={itemVariants}>
        <Form {...form}>
          <form className="mt-8 space-y-6">
            {/* Name Field */}
            {!isSocialProviderLoading && (
              <ProfileField
                label="Name"
                placeholder="Enter Full Name"
                value={form.watch("name")}
                onChange={(value) => form.setValue("name", value)}
                isLocked={isNameLocked}
                onToggleLock={handleNameLockToggle}
                onSave={handleNameUpdate}
                isSaveEnabled={isNameSaveEnabled}
                isPending={updateProfile.isPending}
                isDisabled={isSocialUser}
                showLockControls={!isSocialUser}
              />
            )}

            {/* Professional Title Field */}
            <ProfileField
              label="Professional Title or Designation"
              placeholder="Enter Professional Title or Designation"
              value={form.watch("title")}
              onChange={(value) => form.setValue("title", value)}
              isLocked={isTitleLocked}
              onToggleLock={handleTitleLockToggle}
              onSave={handleTitleUpdate}
              isSaveEnabled={isTitleSaveEnabled}
              isPending={updateProfile.isPending}
            />

            {/* Institution Field */}
            <ProfileField
              label="Institution or Organization"
              placeholder="Enter Institution or Organization"
              value={form.watch("institution")}
              onChange={(value) => form.setValue("institution", value)}
              isLocked={isInstitutionLocked}
              onToggleLock={handleInstitutionLockToggle}
              onSave={handleInstitutionUpdate}
              isSaveEnabled={isInstitutionSaveEnabled}
              isPending={updateProfile.isPending}
            />

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
              labelStyles="text-sm font-medium text-slate-700 font-inter"
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
