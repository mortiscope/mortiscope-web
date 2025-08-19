import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignOutAllButtonProps {
  sessionsCount: number;
  userId?: string;
  onSignOutAllDevices: () => void;
}

/**
 * Sign out all button component.
 * Handles the sign out of all devices functionality with proper disabled states.
 */
export const SignOutAllButton = ({
  sessionsCount,
  userId,
  onSignOutAllDevices,
}: SignOutAllButtonProps) => {
  const isDisabled = !userId || sessionsCount <= 1;

  return (
    <div className={cn("w-full md:w-auto", isDisabled && "cursor-not-allowed")}>
      <Button
        onClick={onSignOutAllDevices}
        disabled={isDisabled}
        className={cn(
          "font-inter h-10 w-full rounded-lg font-normal text-white transition-all duration-300 ease-in-out",
          // Applies disabled styling based on the number of sessions.
          !isDisabled
            ? "cursor-pointer bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
            : "cursor-not-allowed bg-rose-400 opacity-50"
        )}
      >
        Sign out of all devices
      </Button>
    </div>
  );
};

SignOutAllButton.displayName = "SignOutAllButton";
