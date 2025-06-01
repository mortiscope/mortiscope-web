import type { Metadata } from "next";
import { Suspense } from "react";

import ResetPasswordForm from "@/components/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Reset Password • MortiScope",
};

function ResetPasswordSkeleton() {
  return (
    <div className="flex w-full flex-col items-center space-y-5 px-4 py-6 md:px-0 md:py-0">
      <Skeleton className="h-[60px] w-[60px] rounded-full md:h-[80px] md:w-[80px]" />
      <div className="w-full max-w-sm text-center">
        <Skeleton className="mx-auto h-8 w-3/4" />
        <Skeleton className="mx-auto mt-2 h-4 w-full" />
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
