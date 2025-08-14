"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import QRCode from "react-qr-code";
import { BeatLoader } from "react-spinners";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
 * Props for the two factor enable modal component.
 */
interface TwoFactorEnableModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to handle modal open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Callback when two-factor authentication is successfully enabled */
  onSuccess: () => void;
}

/**
 * Modal component for enabling two-factor authentication.
 * Displays a QR code and OTP input for completing 2FA setup.
 */
export const TwoFactorEnableModal = ({
  isOpen,
  onOpenChange,
  onSuccess,
}: TwoFactorEnableModalProps) => {
  const [otpValue, setOtpValue] = useState("");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const { setupTwoFactor, verifyTwoFactor } = useAccountMutation();

  // Setup two-factor authentication when modal opens
  useEffect(() => {
    if (isOpen && !secret) {
      setupTwoFactor.mutate(
        {},
        {
          onSuccess: (data) => {
            if (data.success && data.data) {
              setSecret(data.data.secret);
              setQrCodeUrl(data.data.qrCodeUrl);
            }
          },
        }
      );
    }
  }, [isOpen, secret, setupTwoFactor]);

  // Handle OTP verification
  const handleVerifyOtp = () => {
    if (otpValue.length === 6 && secret) {
      verifyTwoFactor.mutate(
        { secret, token: otpValue },
        {
          onSuccess: (data) => {
            if (data.success) {
              onSuccess();
              handleClose();
            }
          },
        }
      );
    }
  };

  // Handle OTP value change with number-only filtering
  const handleOtpChange = (value: string) => {
    // Only allow numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    setOtpValue(numericValue);
  };

  // Handle modal close
  const handleClose = () => {
    setOtpValue("");
    setSecret("");
    setQrCodeUrl("");
    onOpenChange(false);
  };

  // Check if finish button should be enabled
  const isFinishEnabled = otpValue.length === 6 && !verifyTwoFactor.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Enable Two-Factor
              </DialogTitle>
              <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-600">
                Scan the QR code with an authenticator app and enter the verification code to
                activate two-factor authentication.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* QR Code */}
          <motion.div variants={itemVariants} className="flex justify-center px-6 py-4">
            {qrCodeUrl ? (
              <div className="flex h-[232px] w-[232px] items-center justify-center rounded-lg border-2 border-slate-200 bg-white p-4">
                <QRCode value={qrCodeUrl} size={200} />
              </div>
            ) : (
              <div className="flex h-[232px] w-[232px] items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50">
                <BeatLoader color="#16a34a" size={12} />
              </div>
            )}
          </motion.div>

          {/* OTP Input */}
          <motion.div variants={itemVariants} className="px-6 py-0">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={handleOtpChange}
                containerClassName="gap-2 has-disabled:opacity-50"
                className="font-mono disabled:cursor-not-allowed"
              >
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center border-2 border-slate-200 font-mono text-sm font-normal text-slate-800 shadow-none transition-all first:rounded-l-md last:rounded-r-md focus-visible:border-emerald-600 focus-visible:ring-0 focus-visible:ring-offset-0 data-[active=true]:z-10 data-[active=true]:border-emerald-600 data-[active=true]:ring-0 sm:h-12 sm:w-12 sm:text-base"
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <div className="flex w-full flex-row gap-3">
              <div className={cn("flex-1", verifyTwoFactor.isPending && "cursor-not-allowed")}>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={verifyTwoFactor.isPending}
                  className="font-inter h-10 w-full cursor-pointer overflow-hidden uppercase transition-all duration-300 ease-in-out hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
              </div>
              <div className={cn("flex-1", !isFinishEnabled && "cursor-not-allowed")}>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={!isFinishEnabled}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden bg-emerald-600 text-white uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
                >
                  {verifyTwoFactor.isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify</span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

TwoFactorEnableModal.displayName = "TwoFactorEnableModal";
