import type { Metadata } from "next";

import ResetPasswordForm from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password • MortiScope",
};

export default function ForgotPasswordPage() {
  return <ResetPasswordForm />;
}
