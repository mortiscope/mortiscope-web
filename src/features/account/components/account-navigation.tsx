"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { memo } from "react";
import { GoShieldCheck } from "react-icons/go";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { IoImagesOutline, IoTrashBinOutline } from "react-icons/io5";
import { PiDevices } from "react-icons/pi";

import { UserAvatar } from "@/components/user-avatar";
import { useProfileImage } from "@/features/account/hooks/use-profile-image";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the account navigation component.
 */
interface AccountNavigationProps {
  /** The currently active tab's value. */
  activeTab: string;
  /** A callback function to handle tab changes. */
  onTabChange: (value: string) => void;
}

/**
 * A list of tab configurations to be rendered.
 */
const TABS = [
  { value: "profile", label: "Profile", icon: HiOutlineUserCircle },
  { value: "security", label: "Security", icon: GoShieldCheck },
  { value: "sessions", label: "Sessions", icon: PiDevices },
  { value: "deletion", label: "Deletion", icon: IoTrashBinOutline },
];

/**
 * The navigation component for the account settings page.
 * It serves as the container for the different account settings tabs.
 */
export const AccountNavigation = memo(({ activeTab, onTabChange }: AccountNavigationProps) => {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { fileInputRef, isUploading, selectFile, handleFileChange, optimisticImageUrl } =
    useProfileImage();

  // Don't render anything until session is loaded and user is available
  if (status === "loading" || !user) {
    return null;
  }

  // Use optimistic image URL if available, otherwise fall back to session image
  const effectiveImageUrl = optimisticImageUrl || user.image;

  return (
    <div className="w-full lg:px-6 lg:pt-8 lg:pb-8">
      {/* User Profile Section */}
      <div className="hidden lg:mb-6 lg:flex lg:items-center lg:justify-center lg:py-0">
        <div className="flex max-w-full flex-col items-center text-center">
          <div
            className="group relative mb-4 h-24 w-24 cursor-pointer overflow-hidden rounded-full ring-2 ring-emerald-500 ring-offset-4 ring-offset-emerald-50"
            onClick={selectFile}
          >
            <UserAvatar
              user={{
                ...user,
                image: effectiveImageUrl,
              }}
              size="lg"
              className="!h-24 !w-24 transition-all duration-700 ease-out group-hover:scale-125 group-hover:blur-sm"
            />
            {/* Overlay with upload icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/40 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100">
              {isUploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <IoImagesOutline className="h-8 w-8 text-white" />
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(",")}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <h3 className="font-plus-jakarta-sans max-w-full truncate px-2 text-xl font-medium text-emerald-700">
            {user.name}
          </h3>
          {user.email && (
            <p className="font-inter mt-1 max-w-full truncate px-2 text-sm text-emerald-600">
              {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="font-inter grid h-12 w-full grid-cols-4 rounded-none bg-transparent p-1.5 md:h-14 md:rounded-xl md:bg-emerald-600 md:p-2 lg:flex lg:h-auto lg:flex-col lg:gap-2 lg:bg-transparent lg:p-0">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative cursor-pointer py-3 text-emerald-700 md:py-0 md:text-white lg:w-full lg:justify-start lg:rounded-lg lg:px-8 lg:py-3 lg:text-emerald-700",
              "flex items-center justify-center lg:justify-start"
            )}
          >
            {/* The animated pill that slides to the active tab */}
            {activeTab === tab.value && (
              <motion.div
                layoutId="active-account-tab-pill"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                className="absolute inset-0 rounded-lg border-2 border-emerald-300 bg-emerald-200/75 sm:border-0 sm:border-none md:bg-emerald-500 lg:bg-emerald-200/75"
              />
            )}
            <span className="relative z-10 flex items-center justify-center lg:justify-start">
              <tab.icon className="size-5 md:size-4 lg:mr-3 lg:size-5" />
              <span className="ml-2 hidden text-sm sm:inline lg:ml-0 lg:inline">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

AccountNavigation.displayName = "AccountNavigation";
