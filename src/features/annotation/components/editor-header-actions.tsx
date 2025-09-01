"use client";

import { memo } from "react";
import { GoUnverified, GoVerified } from "react-icons/go";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack, PiSealPercent, PiSealWarning } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "@/lib/constants";

/**
 * Defines the props for the editor header actions component.
 */
interface EditorHeaderActionsProps {
  /** The verification status of the current image. */
  verificationStatus: keyof typeof STATUS_CONFIG;
  /** Handler for clicking the verification status icon. */
  onVerificationClick: (status: keyof typeof STATUS_CONFIG) => void;
  /** Whether the editor is locked. */
  isLocked: boolean;
  /** Handler for toggling the lock state. */
  onToggleLock: () => void;
  /** Whether there are unsaved changes. */
  hasChanges: boolean;
  /** Whether a save operation is in progress. */
  isSaving: boolean;
  /** Handler for clicking the save button. */
  onSaveClick: () => void;
}

/**
 * The right section of the editor header containing action buttons.
 */
export const EditorHeaderActions = memo(
  ({
    verificationStatus,
    onVerificationClick,
    isLocked,
    onToggleLock,
    hasChanges,
    isSaving,
    onSaveClick,
  }: EditorHeaderActionsProps) => {
    const { label } = STATUS_CONFIG[verificationStatus];

    return (
      <div className="flex flex-shrink-0 items-center gap-1">
        {/* Verification status icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onVerificationClick(verificationStatus)}
          aria-label={label}
          className="group h-8 w-8 cursor-pointer bg-transparent text-slate-100 hover:bg-transparent hover:text-slate-100 focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6"
        >
          {verificationStatus === "verified" ? (
            <GoVerified className="text-emerald-300" />
          ) : verificationStatus === "in_progress" ? (
            <PiSealPercent className="text-sky-300" />
          ) : verificationStatus === "unverified" ? (
            <GoUnverified className="text-amber-300" />
          ) : (
            <PiSealWarning className="text-rose-300" />
          )}
        </Button>

        {/* Lock/Unlock button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLock}
          aria-label={isLocked ? "Unlock editor" : "Lock editor"}
          className="group h-8 w-8 bg-transparent text-slate-100 hover:cursor-pointer hover:bg-transparent hover:text-slate-100 focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6"
        >
          {isLocked ? (
            <HiOutlineLockClosed className="transition-colors duration-200 group-hover:text-amber-200" />
          ) : (
            <HiOutlineLockOpen className="transition-colors duration-200 group-hover:text-emerald-200" />
          )}
        </Button>

        {/* Save button */}
        <div className={!hasChanges || isSaving ? "cursor-not-allowed" : ""}>
          <Button
            variant="ghost"
            size="icon"
            disabled={!hasChanges || isSaving}
            onClick={onSaveClick}
            aria-label="Save"
            className={`group h-8 w-8 bg-transparent focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6 ${
              hasChanges && !isSaving
                ? "text-slate-100 hover:cursor-pointer hover:bg-transparent hover:text-slate-100"
                : "cursor-not-allowed text-slate-100/30 hover:bg-transparent hover:text-slate-100/30"
            }`}
          >
            {isSaving ? (
              <LuLoaderCircle className="animate-spin" />
            ) : (
              <PiFloppyDiskBack
                className={`transition-colors duration-200 ${hasChanges ? "group-hover:text-emerald-200" : ""}`}
              />
            )}
          </Button>
        </div>
      </div>
    );
  }
);

EditorHeaderActions.displayName = "EditorHeaderActions";
