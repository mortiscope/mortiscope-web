"use client";

import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCaseName } from "@/features/results/hooks/use-case-name";
import { cn } from "@/lib/utils";

interface ResultsBreadcrumbProps {
  caseId: string;
}

/**
 * A specialized breadcrumb component for the results page, with responsive displays.
 */
export function ResultsBreadcrumb({ caseId }: ResultsBreadcrumbProps) {
  const { data: caseData, isLoading } = useCaseName(caseId);

  const caseNameContent = isLoading ? "Loading..." : (caseData?.caseName ?? "Case");

  return (
    <Breadcrumb className="font-inter w-full">
      <BreadcrumbList className="whitespace-nowrap">
        {/* Large screen view */}
        <BreadcrumbItem className="hidden uppercase lg:block">
          <BreadcrumbPage>Mortiscope</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden lg:block" />

        {/* Medium screen view */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/results" className="group">
              <span
                className={cn(
                  "transition-colors duration-300 ease-in-out",
                  "group-hover:text-emerald-600"
                )}
              >
                Results
              </span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Displayed on all screens, truncates if necessary */}
        <BreadcrumbItem className="min-w-0 flex-1">
          <BreadcrumbPage className="truncate">{caseNameContent}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

ResultsBreadcrumb.displayName = "ResultsBreadcrumb";
