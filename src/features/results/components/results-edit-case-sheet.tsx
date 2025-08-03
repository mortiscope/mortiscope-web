"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Defines the props for the ResultsEditCaseSheet component.
 */
interface ResultsEditCaseSheetProps {
  /** Controls whether the sheet is open or closed. */
  isOpen: boolean;
  /** A callback function that is triggered when the sheet's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  /** Optional class name to apply to the sheet content. */
  className?: string;
}

/**
 * A customized sheet component for editing case details.
 */
export const ResultsEditCaseSheet = ({
  isOpen,
  onOpenChange,
  className,
}: ResultsEditCaseSheetProps) => {
  return (
    <SheetPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-500 ease-in-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <SheetPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l-2 border-slate-200 bg-white sm:max-w-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out transition ease-in-out data-[state=closed]:duration-500 data-[state=open]:duration-500",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            className
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="relative flex h-16 items-center justify-center border-b-2 border-slate-200 md:h-20">
            <SheetPrimitive.Title className="font-plus-jakarta-sans text-lg font-semibold text-slate-900 md:text-xl">
              Edit Case Details
            </SheetPrimitive.Title>

            <SheetPrimitive.Description className="sr-only">
              Make changes to the case details here.
            </SheetPrimitive.Description>

            <SheetPrimitive.Close className="focus:ring-ring absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          </div>

          <div className="p-6"></div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
};
