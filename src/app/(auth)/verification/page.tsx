import type { Metadata } from "next";

import VerificationForm from "@/features/auth/components/verification-form";

export const metadata: Metadata = {
  title: "Verification • MortiScope",
};

export default function VerificationPage() {
  return <VerificationForm />;
}
