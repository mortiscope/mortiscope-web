"use client";

import { type Editor, EditorContent } from "@tiptap/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Defines the props for the note editor content area component.
 */
interface NoteEditorContentAreaProps {
  /** The Tiptap editor instance whose content will be rendered. */
  editor: Editor;
  /** A boolean to apply different styling for view-only vs. editable modes. */
  isEditable: boolean;
}

/**
 * A memoized presentational component that renders the main content area for the Tiptap editor.
 */
export const NoteEditorContentArea = React.memo(
  ({ editor, isEditable }: NoteEditorContentAreaProps) => {
    return (
      // The outer container provides the scrollable area for the editor's content.
      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            // Base typography styles from the `@tailwindcss/typography` plugin.
            "prose prose-sm dark:prose-invert prose-p:m-0 prose-ul:list-disc prose-ul:pl-6 prose-ul:m-0 prose-ol:list-decimal prose-ol:pl-6 prose-ol:m-0 max-w-none px-8 py-6 text-sm",
            // Conditional styling that applies different text colors for a clearer distinction between edit and view modes.
            isEditable
              ? "prose-h1:text-slate-800 prose-blockquote:text-slate-600 text-slate-800"
              : "prose-h1:text-slate-500 prose-blockquote:text-slate-500 prose-h1:text-lg prose-h1:font-semibold prose-h1:mt-2 prose-h1:mb-2 prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-2 text-slate-500"
          )}
        >
          {/* The core Tiptap component that renders the editor's content as HTML. */}
          <EditorContent
            editor={editor}
            // Cmplex class name for specific, targeted styling of the custom Tiptap
            className="w-full [&_input[type='checkbox']]:mr-0.5 [&_input[type='checkbox']]:h-3.5 [&_input[type='checkbox']]:w-5 [&_input[type='checkbox']]:cursor-pointer [&_input[type='checkbox']]:accent-emerald-500 [&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-center [&_li[data-type='taskItem']]:gap-2"
          />
        </div>
      </div>
    );
  }
);

NoteEditorContentArea.displayName = "NoteEditorContentArea";
