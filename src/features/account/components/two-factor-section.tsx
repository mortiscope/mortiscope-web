import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the two-factor section component.
 */
interface TwoFactorSectionProps {
  /** A boolean indicating whether two-factor authentication is currently enabled for the user. */
  isTwoFactorEnabled: boolean;
  /** A callback function invoked when the 2FA toggle switch is changed. */
  onTwoFactorToggle: (checked: boolean) => void;
  /** A callback function invoked when the recovery codes button is clicked. */
  onRecoveryCodesClick: () => void;
}

/**
 * A presentational component that renders the interface for managing two-factor authentication (2FA).
 * It includes a toggle switch to enable/disable 2FA and a button to view recovery codes, is
 * conditionally displayed only when 2FA is enabled.
 */
export const TwoFactorSection = memo(
  ({ isTwoFactorEnabled, onTwoFactorToggle, onRecoveryCodesClick }: TwoFactorSectionProps) => {
    return (
      <div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* The main container for the 2FA toggle switch. */}
          <div className="w-full">
            <div
              className={cn(
                uniformInputStyles,
                "flex w-full items-center justify-between rounded-md px-3 py-2 shadow-none"
              )}
            >
              <span className="font-inter text-sm text-slate-700">Two-Factor Authentication</span>
              <Switch
                id="two-factor-toggle"
                className="cursor-pointer data-[state=checked]:bg-emerald-600"
                checked={isTwoFactorEnabled}
                onCheckedChange={onTwoFactorToggle}
                disabled={false}
              />
            </div>
          </div>
          {/* Conditionally renders the recovery codes button only when 2FA is enabled. */}
          {isTwoFactorEnabled && (
            <div className="w-full">
              <Button
                type="button"
                className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden bg-emerald-600 text-white transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
                onClick={onRecoveryCodesClick}
              >
                Recovery Codes
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

TwoFactorSection.displayName = "TwoFactorSection";
