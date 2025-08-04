"use client";

import * as React from "react";
import { BeatLoader } from "react-spinners";

import { cn } from "@/lib/utils";

/**
 * A loading placeholder that is shown while the editor is initializing.
 */
export const NoteEditorLoading = React.memo(({ className }: { className?: string }) => {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center", className)}>
      <BeatLoader color="#16a34a" size={12} />
    </div>
  );
});

NoteEditorLoading.displayName = "NoteEditorLoading";
