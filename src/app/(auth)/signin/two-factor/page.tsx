import type { Metadata } from "next";

import TwoFactorForm from "@/features/auth/components/two-factor-form";

export const metadata: Metadata = {
  title: "Two-Factor Authentication • MortiScope",
};

export default function TwoFactorPage() {
  return <TwoFactorForm />;
}
