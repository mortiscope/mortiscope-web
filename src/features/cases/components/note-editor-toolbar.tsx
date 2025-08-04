"use client";

import { type Editor } from "@tiptap/react";
import { Eye, Pencil } from "lucide-react";
import * as React from "react";
import {
  FaBold,
  FaCheck,
  FaHeading,
  FaItalic,
  FaListOl,
  FaListUl,
  FaQuoteRight,
  FaStrikethrough,
  FaUnderline,
} from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NoteEditorToolbarButton } from "@/features/cases/components/note-editor-toolbar-button";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the note editor toolbar component.
 */
interface NoteEditorToolbarProps {
  /** The Tiptap editor instance to control and query for active states. */
  editor: Editor;
  /** A boolean indicating if the editor is currently in editable mode. */
  isEditable: boolean;
  /** A callback function to toggle the editor's editable state. */
  toggleEditable: () => void;
}

/**
 * A memoized presentational component that renders the interactive toolbar for the Tiptap editor.
 * It provides buttons for text formatting and a control to switch between view and edit modes.
 */
export const NoteEditorToolbar = React.memo(
  ({ editor, isEditable, toggleEditable }: NoteEditorToolbarProps) => {
    // A simple reducer to force a re-render.
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    /**
     * A wrapper function for Tiptap commands. It executes the given command and then
     * forces a component update to ensure the toolbar buttons correctly reflect the new editor state.
     * @param command The Tiptap command function to execute.
     */
    const handleButtonClick = (command: () => void) => {
      command();
      // Defer the `forceUpdate` to the next tick to allow Tiptap to fully process the command first.
      setTimeout(() => forceUpdate(), 0);
    };

    return (
      // The main sticky container for the toolbar, ensuring it stays visible on scroll.
      <div className="sticky top-0 z-10 bg-emerald-100 p-2">
        <div className="flex items-center justify-between">
          {/* A horizontally scrollable container for the formatting buttons. */}
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-fit items-center space-x-1">
              {/* Each button is an instance of the reusable component. */}
              <NoteEditorToolbarButton
                tooltip="Bold"
                isActive={editor.isActive("bold")}
                onClick={() => handleButtonClick(() => editor.chain().focus().toggleBold().run())}
                isDisabled={!isEditable}
                ariaLabel="Toggle bold"
              >
                <FaBold className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Italic"
                isActive={editor.isActive("italic")}
                onClick={() => handleButtonClick(() => editor.chain().focus().toggleItalic().run())}
                isDisabled={!isEditable}
                ariaLabel="Toggle italic"
              >
                <FaItalic className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Underline"
                isActive={editor.isActive("underline")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleUnderline().run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle underline"
              >
                <FaUnderline className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Strikethrough"
                isActive={editor.isActive("strike")}
                onClick={() => handleButtonClick(() => editor.chain().focus().toggleStrike().run())}
                isDisabled={!isEditable}
                ariaLabel="Toggle strikethrough"
              >
                <FaStrikethrough className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <Separator orientation="vertical" className="mx-2 h-8" />
              <NoteEditorToolbarButton
                tooltip="Heading"
                isActive={editor.isActive("heading")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleHeading({ level: 1 }).run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle heading"
              >
                <FaHeading className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Blockquote"
                isActive={editor.isActive("blockquote")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleBlockquote().run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle blockquote"
              >
                <FaQuoteRight className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <Separator orientation="vertical" className="mx-2 h-8" />
              <NoteEditorToolbarButton
                tooltip="Bullet List"
                isActive={editor.isActive("bulletList")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleBulletList().run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle bullet list"
              >
                <FaListUl className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Numbered List"
                isActive={editor.isActive("orderedList")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleOrderedList().run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle numbered list"
              >
                <FaListOl className="h-4 w-4" />
              </NoteEditorToolbarButton>
              <NoteEditorToolbarButton
                tooltip="Checklist"
                isActive={editor.isActive("taskList")}
                onClick={() =>
                  handleButtonClick(() => editor.chain().focus().toggleTaskList().run())
                }
                isDisabled={!isEditable}
                ariaLabel="Toggle checklist"
              >
                <FaCheck className="h-4 w-4" />
              </NoteEditorToolbarButton>
            </div>
          </div>
          <Separator orientation="vertical" className="mx-3 h-8" />
          {/* The main control to switch between view-only and editable modes. */}
          <div className="flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleEditable}
                  aria-label="Toggle edit mode"
                  className={cn(
                    "cursor-pointer transition-all ease-in-out hover:border-2 hover:border-green-600 hover:bg-green-100 hover:text-green-600",
                    isEditable ? "text-slate-700" : "text-slate-600"
                  )}
                >
                  {isEditable ? <Eye className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-inter">
                <p>{isEditable ? "View" : "Edit"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }
);

NoteEditorToolbar.displayName = "NoteEditorToolbar";
