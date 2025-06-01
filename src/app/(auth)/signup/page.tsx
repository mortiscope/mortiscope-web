import type { Metadata } from "next";

import SignUpForm from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up • MortiScope",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
