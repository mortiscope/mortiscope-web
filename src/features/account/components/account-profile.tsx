"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { PiFloppyDiskBack } from "react-icons/pi";

import { LocationDropdown } from "@/components/location-dropdown";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionTitle,uniformInputStyles } from "@/features/cases/constants/styles";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import { cn } from "@/lib/utils";

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

  // Watch location values for Philippine address hook
  const watchedLocation = form.watch("location");
  const { regionList, provinceList, cityList, barangayList } = usePhilippineAddress({
    regionCode: watchedLocation?.region?.code,
    provinceCode: watchedLocation?.province?.code,
    cityCode: watchedLocation?.city?.code,
  });

  return (
    <div className="w-full">
      {/* Profile Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Profile
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          View and manage your personal information.
        </p>
      </div>

      {/* Profile Form */}
      <Form {...form}>
        <form className="mt-8 space-y-6">
          {/* Name Field */}
          <div className="w-full">
            <Label className={sectionTitle}>Name</Label>
            <div className="mt-2 flex items-start gap-2">
              <div className={cn("flex-grow", { "cursor-not-allowed": isNameLocked })}>
                <Input
                  placeholder="Enter Full Name"
                  className={cn(uniformInputStyles, "w-full")}
                  disabled={isNameLocked}
                  {...form.register("name")}
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
                          "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                          {
                            "border-slate-100": isNameLocked,
                            "border-slate-200": !isNameLocked,
                          }
                        )}
                        onClick={() => setIsNameLocked(!isNameLocked)}
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
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 cursor-pointer border-2 border-slate-200 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10"
                        aria-label="Save"
                      >
                        <PiFloppyDiskBack className="h-5 w-5" />
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

          {/* Professional Title Field */}
          <div className="w-full">
            <Label className={sectionTitle}>Professional Title or Designation</Label>
            <div className="mt-2 flex items-start gap-2">
              <div className={cn("flex-grow", { "cursor-not-allowed": isTitleLocked })}>
                <Input
                  placeholder="Enter Professional Title or Designation"
                  className={cn(uniformInputStyles, "w-full")}
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
                          "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                          {
                            "border-slate-100": isTitleLocked,
                            "border-slate-200": !isTitleLocked,
                          }
                        )}
                        onClick={() => setIsTitleLocked(!isTitleLocked)}
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
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 cursor-pointer border-2 border-slate-200 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10"
                        aria-label="Save"
                      >
                        <PiFloppyDiskBack className="h-5 w-5" />
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

          {/* Institution Field */}
          <div className="w-full">
            <Label className={sectionTitle}>Institution or Organization</Label>
            <div className="mt-2 flex items-start gap-2">
              <div className={cn("flex-grow", { "cursor-not-allowed": isInstitutionLocked })}>
                <Input
                  placeholder="Enter Institution or Organization"
                  className={cn(uniformInputStyles, "w-full")}
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
                          "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                          {
                            "border-slate-100": isInstitutionLocked,
                            "border-slate-200": !isInstitutionLocked,
                          }
                        )}
                        onClick={() => setIsInstitutionLocked(!isInstitutionLocked)}
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
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 cursor-pointer border-2 border-slate-200 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10"
                        aria-label="Save"
                      >
                        <PiFloppyDiskBack className="h-5 w-5" />
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
            onToggleLock={() => setIsLocationLocked(!isLocationLocked)}
            onSaveRegion={() => {}}
            showLabel={true}
            labelText="Location"
            inputStyles={uniformInputStyles}
            labelStyles={sectionTitle}
          />
        </form>
      </Form>
    </div>
  );
};

AccountProfile.displayName = "AccountProfile";
