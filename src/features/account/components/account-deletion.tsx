"use client";

import { useState } from "react";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { PiWarning } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * The deletion tab content component for the account settings page.
 */
export const AccountDeletion = () => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);

  return (
    <div className="w-full">
      {/* Deletion Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Deletion
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Permanently delete your account and all of its associated data.
        </p>
      </div>

      {/* Deletion Form */}
      <div className="mt-8 space-y-4">
        <div className="flex items-start gap-3 rounded-lg border-2 border-rose-400 bg-rose-50 p-3">
          <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
          <p className="font-inter flex-1 text-sm text-rose-400">
            <strong className="font-semibold text-rose-500">Note:</strong> Actions here may result
            in irreversible data loss. Proceed with extreme caution.
          </p>
        </div>

        {/* Input and Button Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="order-1">
            <div className="flex items-start gap-2">
              <div className={cn("flex-grow", { "cursor-not-allowed": isPasswordLocked })}>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  disabled={isPasswordLocked}
                  className={cn(uniformInputStyles, "w-full")}
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
                          "border-slate-100": isPasswordLocked,
                          "border-slate-200": !isPasswordLocked,
                        }
                      )}
                      onClick={() => setIsPasswordLocked(!isPasswordLocked)}
                      aria-label={isPasswordLocked ? "Unlock" : "Lock"}
                    >
                      {isPasswordLocked ? (
                        <HiOutlineLockClosed className="h-5 w-5" />
                      ) : (
                        <HiOutlineLockOpen className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-inter">
                    <p>{isPasswordLocked ? "Unlock" : "Lock"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="order-2">
            <Button
              variant="destructive"
              className="font-inter h-9 w-full cursor-pointer transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20 md:h-10"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

AccountDeletion.displayName = "AccountDeletion";
