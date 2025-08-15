"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HiArrowPath } from "react-icons/hi2";
import { ImSpinner2 } from "react-icons/im";
import { IoCopyOutline } from "react-icons/io5";
import { LuDownload } from "react-icons/lu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccountMutation } from "@/features/account/hooks/use-account-mutation";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants = {
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
 * Props for the RecoveryCodesModal component.
 */
interface RecoveryCodesModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to handle modal open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Optional initial recovery codes (from 2FA setup) */
  initialCodes?: string[];
}

/**
 * A smart modal component for displaying and managing two-factor authentication recovery codes.
 * It handles two primary modes: displaying newly generated codes during setup, and showing the
 * status of existing codes. It orchestrates server actions for fetching and regenerating codes.
 */
export const RecoveryCodesModal = ({
  isOpen,
  onOpenChange,
  initialCodes,
}: RecoveryCodesModalProps) => {
  /** An array representing the 16 code slots, containing either plaintext codes, placeholders, or null. */
  const [displayCodes, setDisplayCodes] = useState<(string | null)[]>([]);
  /** A flag to determine if the modal is in the "initial setup" mode where codes are visible. */
  const [, setIsInitialSetup] = useState(false);
  /** A flag for the loading state, used for both fetching and regenerating codes. */
  const [isLoading, setIsLoading] = useState(false);

  // Initializes a custom hook that provides the server action mutations.
  const { getRecoveryCodes, regenerateRecoveryCodes } = useAccountMutation();

  useEffect(() => {
    if (isOpen) {
      if (initialCodes) {
        // Initial Setup Mode
        setIsInitialSetup(true);
        setIsLoading(false);
        // Pad the array to ensure it always has 16 slots.
        const paddedCodes: (string | null)[] = [...initialCodes];
        while (paddedCodes.length < 16) {
          paddedCodes.push(null);
        }
        setDisplayCodes(paddedCodes.slice(0, 16));
      } else {
        // View Status Mode
        setIsInitialSetup(false);
        setIsLoading(true);
        getRecoveryCodes.mutate(undefined, {
          onSuccess: (
            data:
              | { error: string; success?: undefined; data?: undefined }
              | {
                  success: string;
                  data: {
                    totalCodes: number;
                    usedCount: number;
                    unusedCount: number;
                    codeStatus: boolean[];
                    hasRecoveryCodes: boolean;
                  };
                  error?: undefined;
                }
          ) => {
            if ("success" in data && data.success && data.data) {
              // Map the boolean status array to visual placeholders.
              const codes = data.data.codeStatus.map((hasCode: boolean) =>
                hasCode ? "••••-••••" : null
              );
              setDisplayCodes(codes);
            } else {
              setDisplayCodes(new Array(16).fill(null));
            }
            setIsLoading(false);
          },
          onError: () => {
            setDisplayCodes(new Array(16).fill(null));
            setIsLoading(false);
          },
        });
      }
    }
  }, [isOpen, initialCodes]);

  /**
   * A wrapper for the `onOpenChange` callback that handles modal closing.
   */
  const handleClose = () => {
    onOpenChange(false);
  };

  // Reset state when modal is fully closed to prevent any visual changes during closing
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setDisplayCodes([]);
        setIsInitialSetup(false);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  /** A derived boolean indicating if there are plaintext codes available to be copied. */
  const canCopy = isOpen && displayCodes.some((code) => code && !code.includes("••••"));

  /**
   * Handles the "Copy" action. It filters for plaintext codes, formats them, and
   * uses the modern Clipboard API with a fallback to the legacy `execCommand`.
   */
  const handleCopy = async () => {
    if (!canCopy || !isOpen) return;

    try {
      const actualCodes = displayCodes.filter((code) => code && !code.includes("••••")) as string[];

      if (actualCodes.length === 0) {
        toast.error("No recovery codes available to copy.", { className: "font-inter" });
        return;
      }

      const codesText = `MortiScope Recovery Codes\n${actualCodes.join("\n")}`;

      // Use modern, secure Clipboard API if available.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codesText);
      } else {
        // Fallback for older browsers or insecure contexts.
        const textArea = document.createElement("textarea");
        textArea.value = codesText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Copy command failed");
        }
      }

      toast.success("Recovery codes copied to clipboard.", { className: "font-inter" });
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy codes to clipboard.", { className: "font-inter" });
    }
  };

  /** A derived boolean indicating if there are plaintext codes available to be downloaded. */
  const canDownload = isOpen && displayCodes.some((code) => code && !code.includes("••••"));

  /**
   * Handles the download action. It filters for plaintext codes, creates a text blob,
   * and triggers a file download in the browser.
   */
  const handleDownload = () => {
    if (!canDownload || !isOpen) return;

    try {
      const actualCodes = displayCodes.filter((code) => code && !code.includes("••••")) as string[];

      if (actualCodes.length === 0) {
        toast.error("No recovery codes available to download.", { className: "font-inter" });
        return;
      }

      const codesText = `MortiScope Recovery Codes\n${actualCodes.join("\n")}`;

      // Create a Blob from the text.
      const blob = new Blob([codesText], { type: "text/plain" });
      // Create a temporary URL for the blob.
      const url = URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download.
      const link = document.createElement("a");
      link.href = url;
      link.download = "mortiscope-recovery-codes.txt";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the temporary URL after a short delay.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("Recovery codes downloaded successfully.", { className: "font-inter" });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download recovery codes.", { className: "font-inter" });
    }
  };

  /**
   * Handles the regenerate action by calling the appropriate server mutation and
   * updating the interface with the new, visible codes upon success.
   */
  const handleRegenerate = () => {
    if (!isOpen) return;
    setIsLoading(true);
    regenerateRecoveryCodes.mutate(undefined, {
      onSuccess: (data) => {
        if (data.success && data.data) {
          // Update the interface to show the new plaintext codes.
          const newCodes: (string | null)[] = [...data.data.recoveryCodes];
          while (newCodes.length < 16) {
            newCodes.push(null);
          }
          setDisplayCodes(newCodes.slice(0, 16));
          setIsInitialSetup(true);
        }
        setIsLoading(false);
      },
      onError: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Recovery Codes
              </DialogTitle>
              <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-600">
                {/* Dynamically changes the description based on whether codes are visible. */}
                {initialCodes || displayCodes.some((code) => code && !code.includes("••••"))
                  ? "Save these recovery codes in a safe place. Each code can only be used once to access your account if you lose your authenticator device."
                  : "For security, recovery codes can only be viewed when first generated or regenerated."}
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Main Content: Codes Grid and Actions */}
          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
          >
            {isLoading ? (
              // Renders a skeleton grid while fetching or regenerating codes.
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-4">
                {Array.from({ length: 16 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-10 w-full animate-pulse items-center justify-center rounded-md border-2 border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs sm:h-12 sm:px-3 sm:py-2 sm:text-sm"
                  />
                ))}
              </div>
            ) : (
              // Renders the grid of recovery codes.
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-4">
                {displayCodes.map((code, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-md border-2 px-2 py-1 font-mono text-xs sm:h-12 sm:px-3 sm:py-2 sm:text-sm",
                      // Applies different styles for used, unused, and empty slots.
                      code
                        ? code.includes("••••")
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                        : "border-slate-100 bg-slate-50 text-transparent"
                    )}
                  >
                    {code || ""}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons: Copy, Download, Regenerate */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className={cn({ "cursor-not-allowed": !canCopy })}>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "font-inter flex h-10 w-full items-center justify-center gap-2 border-2 border-slate-200 font-normal shadow-none transition-all duration-300 ease-in-out",
                          canCopy
                            ? "cursor-pointer text-slate-600 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                            : "cursor-not-allowed text-slate-400 opacity-50"
                        )}
                        onClick={handleCopy}
                        disabled={!canCopy}
                      >
                        <IoCopyOutline className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="font-inter sm:hidden">
                      <p>{canCopy ? "Copy" : "No codes to copy"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className={cn({ "cursor-not-allowed": !canDownload })}>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "font-inter flex h-10 w-full items-center justify-center gap-2 border-2 border-slate-200 font-normal shadow-none transition-all duration-300 ease-in-out",
                          canDownload
                            ? "cursor-pointer text-slate-600 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                            : "cursor-not-allowed text-slate-400 opacity-50"
                        )}
                        onClick={handleDownload}
                        disabled={!canDownload}
                      >
                        <LuDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="font-inter sm:hidden">
                      <p>{canDownload ? "Download" : "No codes to download"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className={cn({ "cursor-not-allowed": isLoading })}>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 border-2 border-slate-200 font-normal text-slate-600 shadow-none transition-all duration-300 ease-in-out hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={handleRegenerate}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ImSpinner2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <HiArrowPath className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {isLoading ? "Generating..." : "Regenerate"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="font-inter sm:hidden">
                      <p>Regenerate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </motion.div>

          {/* Footer Section with main actions. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2 pb-6">
            <div className="flex w-full flex-row gap-3">
              <div className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="font-inter h-10 w-full cursor-pointer overflow-hidden uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                >
                  Cancel
                </Button>
              </div>
              <div className="flex-1">
                <Button
                  onClick={handleClose}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden bg-emerald-600 text-white uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  Finish
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

RecoveryCodesModal.displayName = "RecoveryCodesModal";
