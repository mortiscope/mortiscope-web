"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useTwoFactorAuth } from "@/features/account/hooks/use-two-factor-auth";

/**
 * Custom hook for managing recovery codes state and actions.
 * Handles fetching, displaying, and manipulating recovery codes.
 */
export const useRecoveryCodes = (isOpen: boolean, initialCodes?: string[]) => {
  /** An array representing the 16 code slots, containing either plaintext codes, placeholders, or null. */
  const [displayCodes, setDisplayCodes] = useState<(string | null)[]>([]);
  /** A flag to determine if the modal is in the initial setup mode where codes are visible. */
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  /** A flag for the loading state, used for both fetching and regenerating codes. */
  const [isLoading, setIsLoading] = useState(false);
  /** Track the data is already fetched for this modal session to prevent infinite loops */
  const hasFetchedRef = useRef(false);

  // Initializes a custom hook that provides the server action mutations.
  const { getRecoveryCodes, regenerateRecoveryCodes } = useTwoFactorAuth();
  const { mutate: getRecoveryCodesMutate } = getRecoveryCodes;

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
        hasFetchedRef.current = true;
      } else if (!hasFetchedRef.current) {
        // View Status Mode
        setIsInitialSetup(false);
        setIsLoading(true);
        hasFetchedRef.current = true;

        getRecoveryCodesMutate(undefined, {
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
    } else {
      // Reset the fetch flag when modal closes
      hasFetchedRef.current = false;
    }
  }, [isOpen, initialCodes, getRecoveryCodesMutate]);

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

  /**
   * Handles the copy action. It filters for plaintext codes, formats them, and
   * uses the modern Clipboard API with a fallback to the legacy `execCommand`.
   */
  const handleCopy = async () => {
    const canCopy = isOpen && displayCodes.some((code) => code && !code.includes("••••"));
    if (!canCopy || !isOpen) return;

    try {
      const actualCodes = displayCodes.filter((code) => code && !code.includes("••••")) as string[];

      if (actualCodes.length === 0) {
        toast.error("No recovery codes available to copy.", { className: "font-inter" });
        return;
      }

      const codesText = `MortiScope Recovery Codes\n${actualCodes.join("\n")}`;

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

  /**
   * Handles the download action. It filters for plaintext codes, creates a text blob,
   * and triggers a file download in the browser.
   */
  const handleDownload = () => {
    const canDownload = isOpen && displayCodes.some((code) => code && !code.includes("••••"));
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

  // Derived states
  const canCopy = isOpen && displayCodes.some((code) => code && !code.includes("••••"));
  const canDownload = isOpen && displayCodes.some((code) => code && !code.includes("••••"));
  const hasVisibleCodes = displayCodes.some((code) => code && !code.includes("••••"));

  return {
    displayCodes,
    isInitialSetup,
    isLoading,
    canCopy,
    canDownload,
    hasVisibleCodes,
    handleCopy,
    handleDownload,
    handleRegenerate,
  };
};
