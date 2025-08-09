"use client";

import * as React from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { NoteEditorContentArea } from "@/features/cases/components/note-editor-content-area";
import { NoteEditorLoading } from "@/features/cases/components/note-editor-loading";
import { NoteEditorToolbar } from "@/features/cases/components/note-editor-toolbar";
import { useCaseNoteEditor } from "@/features/cases/hooks/use-case-note-editor";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the `CaseNoteEditor` component.
 */
interface CaseNoteEditorProps {
  /** The HTML content of the editor, making it a controlled component. */
  value: string;
  /** A callback function that is invoked with the new HTML content whenever the editor's content changes. */
  onChange: (richText: string) => void;
  /** An optional class name to apply custom styling to the editor container. */
  className?: string;
}

/**
 * A smart component that orchestrates a Tiptap rich-text editor.
 */
export const CaseNoteEditor = ({ value, onChange, className }: CaseNoteEditorProps) => {
  // Initializes the master hook that encapsulates all Tiptap-related state and logic.
  const { editor, isEditable, toggleEditable } = useCaseNoteEditor({ value, onChange });

  // If the editor instance from the `useEditor` hook is not yet initialized, render loader.
  if (!editor) {
    return <NoteEditorLoading className={className} />;
  }

  return (
    // Wraps the entire editor in a TooltipProvider to enable tooltips for all child components.
    <TooltipProvider delayDuration={100}>
      {/* The main container for the editor, which arranges the toolbar and content area vertically. */}
      <div className={cn("flex flex-col", className)}>
        {/* Renders the interactive toolbar, passing down the editor instance and state from the hook. */}
        <NoteEditorToolbar
          editor={editor}
          isEditable={isEditable}
          toggleEditable={toggleEditable}
        />
        {/* Renders the main content area, passing down the editor instance and editable state for styling. */}
        <NoteEditorContentArea editor={editor} isEditable={isEditable} />
      </div>
    </TooltipProvider>
  );
};

CaseNoteEditor.displayName = "CaseNoteEditor";
