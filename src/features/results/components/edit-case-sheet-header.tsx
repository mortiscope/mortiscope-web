"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

/**
 * Renders the static header for the Edit Case sheet.
 */
export const EditCaseSheetHeader = React.memo(() => {
  return (
    <div className="relative flex h-16 shrink-0 items-center justify-center border-none md:h-20">
      <SheetPrimitive.Title className="font-plus-jakarta-sans text-lg font-semibold text-slate-900 md:text-xl">
        Edit Case
      </SheetPrimitive.Title>
      <SheetPrimitive.Description className="sr-only">
        Make changes to the case details, notes, or view its history here.
      </SheetPrimitive.Description>
      <SheetPrimitive.Close className="focus:ring-ring absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
        <XIcon className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </div>
  );
});

EditCaseSheetHeader.displayName = "EditCaseSheetHeader";
