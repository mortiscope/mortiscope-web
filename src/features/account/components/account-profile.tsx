"use client";

import { useState } from "react";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The profile tab content component for the account settings page.
 */
export const AccountProfile = () => {
  const [isNameLocked, setIsNameLocked] = useState(true);
  const [isTitleLocked, setIsTitleLocked] = useState(true);
  const [isInstitutionLocked, setIsInstitutionLocked] = useState(true);

  const inputStyles =
    "font-inter !h-9 border-2 border-slate-200 text-sm placeholder:!text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:!h-10";
  const labelStyles = "text-medium font-inter font-normal text-slate-800";

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

      {/* Profile Form Fields */}
      <div className="mt-8 space-y-6">
        {/* Name Field */}
        <div className="w-full">
          <Label className={labelStyles}>Name</Label>
          <div className="mt-2 flex items-start gap-2">
            <div className={cn("flex-grow", { "cursor-not-allowed": isNameLocked })}>
              <Input
                placeholder="Enter Full Name"
                className={cn(inputStyles, "w-full")}
                disabled={isNameLocked}
              />
            </div>
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
          </div>
        </div>

        {/* Professional Title Field */}
        <div className="w-full">
          <Label className={labelStyles}>Professional Title or Designation</Label>
          <div className="mt-2 flex items-start gap-2">
            <div className={cn("flex-grow", { "cursor-not-allowed": isTitleLocked })}>
              <Input
                placeholder="Enter Professional Title or Designation"
                className={cn(inputStyles, "w-full")}
                disabled={isTitleLocked}
              />
            </div>
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
          </div>
        </div>

        {/* Institution Field */}
        <div className="w-full">
          <Label className={labelStyles}>Institution or Organization</Label>
          <div className="mt-2 flex items-start gap-2">
            <div className={cn("flex-grow", { "cursor-not-allowed": isInstitutionLocked })}>
              <Input
                placeholder="Enter Institution or Organization"
                className={cn(inputStyles, "w-full")}
                disabled={isInstitutionLocked}
              />
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

AccountProfile.displayName = "AccountProfile";
