import type { Metadata } from "next";

import RecoveryForm from "@/features/auth/components/recovery-form";

export const metadata: Metadata = {
  title: "Account Recovery • MortiScope",
};

export default function RecoveryPage() {
  return <RecoveryForm />;
}
