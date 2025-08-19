import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SocialProviderUserDeletionProps {
  isDeleteLocked: boolean;
  isDeleteEnabled: boolean;
  onDeleteAccount: () => void;
  onDeleteLockToggle: () => void;
}

/**
 * Social provider user deletion component.
 * Handles deletion for users who signed up with social providers.
 */
export const SocialProviderUserDeletion = ({
  isDeleteLocked,
  isDeleteEnabled,
  onDeleteAccount,
  onDeleteLockToggle,
}: SocialProviderUserDeletionProps) => {
  return (
    <div className="flex items-start gap-2">
      <div className={cn("flex-grow", { "cursor-not-allowed": !isDeleteEnabled })}>
        <Button
          disabled={!isDeleteEnabled}
          className={cn(
            "font-inter h-9 w-full transition-all duration-300 ease-in-out disabled:opacity-100 md:h-10",
            isDeleteEnabled
              ? "cursor-pointer bg-rose-600 text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
              : "cursor-not-allowed bg-rose-400 text-rose-100 hover:bg-rose-400"
          )}
          onClick={onDeleteAccount}
        >
          Delete Account
        </Button>
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
                "border-slate-200 disabled:opacity-100"
              )}
              onClick={onDeleteLockToggle}
              aria-label={isDeleteLocked ? "Unlock" : "Lock"}
            >
              {isDeleteLocked ? (
                <HiOutlineLockClosed className="h-5 w-5" />
              ) : (
                <HiOutlineLockOpen className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="font-inter">
            <p>{isDeleteLocked ? "Unlock" : "Lock"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
