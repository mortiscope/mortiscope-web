"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { BeatLoader } from "react-spinners";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
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
  onSuccess: (recoveryCodes?: string[]) => void;
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
              onSuccess(data.data?.recoveryCodes);
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
          <AccountModalHeader
            title="Enable Two-Factor"
            description="Scan the QR code with an authenticator app and enter the verification code to activate two-factor authentication."
            variant="emerald"
          />

          {/* QR Code */}
          <motion.div variants={itemVariants} className="flex justify-center px-6 py-4">
            {qrCodeUrl ? (
              <div className="flex h-[232px] w-[232px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4">
                <QRCode value={qrCodeUrl} size={200} />
              </div>
            ) : (
              <div className="flex h-[232px] w-[232px] items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50">
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
                  {Array.from({ length: 6 }).map((_, index) => {
                    const hasValue = otpValue[index];
                    return (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-md border-2 font-mono text-sm font-normal shadow-none transition-all duration-600 ease-in-out focus-visible:ring-0 focus-visible:ring-offset-0 data-[active=true]:z-10 data-[active=true]:ring-0 sm:h-12 sm:w-12 sm:text-base",
                          hasValue
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-transparent text-slate-800",
                          "focus-visible:border-emerald-600 data-[active=true]:border-emerald-600"
                        )}
                      />
                    );
                  })}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </motion.div>

          {/* Footer */}
          <AccountModalFooter
            isPending={verifyTwoFactor.isPending}
            onCancel={handleClose}
            onAction={handleVerifyOtp}
            actionButtonText="Verify"
            pendingButtonText="Verifying..."
            disabled={!isFinishEnabled}
            variant="emerald"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

TwoFactorEnableModal.displayName = "TwoFactorEnableModal";
