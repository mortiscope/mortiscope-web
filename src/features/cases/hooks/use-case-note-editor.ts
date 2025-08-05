"use client";

import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import Heading from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as React from "react";

/**
 * Defines the props for the use case note editor hook.
 */
interface UseCaseNoteEditorProps {
  /** The HTML content of the editor, making it a controlled hook. */
  value: string;
  /** A callback function invoked with the new HTML content when the editor's content changes. */
  onChange: (richText: string) => void;
}

/**
 * A custom hook that encapsulates all Tiptap editor logic, including initialization,
 * state management for edit/view modes, and event handling.
 *
 * @param {UseCaseNoteEditorProps} props The props to configure the hook.
 * @returns An object containing the Tiptap editor instance, the current editable state,
 *          and a function to toggle the editable state.
 */
export const useCaseNoteEditor = ({ value, onChange }: UseCaseNoteEditorProps) => {
  // Local state to control whether the editor is in editable or read-only mode.
  const [isEditable, setIsEditable] = React.useState(false);

  // The core Tiptap hook that initializes and manages the editor instance.
  const editor = useEditor({
    // Configuration for all the rich-text features (extensions) enabled in the editor.
    extensions: [
      // The `StarterKit` provides a sensible baseline of common extensions.
      StarterKit.configure({
        // Specific features are disabled here to be replaced by our custom-configured versions below.
        heading: false,
        blockquote: false,
        horizontalRule: false,
        codeBlock: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      // Additional extensions for enhanced typography and styling.
      Typography,
      Underline,
      // Custom configurations apply specific Tailwind CSS classes to the rendered HTML elements.
      BulletList.configure({ HTMLAttributes: { class: "list-disc pl-6 m-0" } }),
      OrderedList.configure({ HTMLAttributes: { class: "list-decimal pl-6 m-0" } }),
      ListItem,
      Heading.configure({
        levels: [1],
        HTMLAttributes: { class: "text-lg font-semibold mt-2 mb-2" },
      }),
      Blockquote.configure({
        HTMLAttributes: { class: "border-l-4 border-slate-300 pl-4 italic my-2" },
      }),
      TaskList.configure({ HTMLAttributes: { class: "not-prose pl-2" } }),
      TaskItem.configure({
        HTMLAttributes: { class: "flex items-center my-1 gap-2" },
        nested: true,
      }),
    ],
    // Sets the initial content of the editor from the `value` prop.
    content: value,
    onUpdate({ editor }) {
      // This callback makes the hook "controlled" by propagating content changes to the parent component.
      onChange(editor.getHTML());
    },
    // Binds the editor's editable state to our local React state.
    editable: isEditable,
    // Prevents rendering until fully initialized.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Sets the base CSS classes for the main editable area.
        class: "focus:outline-none",
      },
    },
  });

  /**
   * A crucial side effect for a controlled component pattern. It synchronizes the
   * editor's internal content with the external `value` prop if it changes from the
   * parent (e.g., due to a server update). `emitUpdate: false` is essential to prevent
   * an infinite loop of updates.
   */
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const editorContent = editor.getHTML();
    if (value !== editorContent) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  /**
   * Toggles the editor's editable state and programmatically focuses the editor
   * when transitioning into edit mode for a better user experience.
   */
  const toggleEditable = () => {
    const newEditableState = !isEditable;
    setIsEditable(newEditableState);
    editor?.setEditable(newEditableState);
    if (newEditableState) {
      editor?.chain().focus().run();
      // Trigger `onChange` when entering edit mode to mark the field as dirty
      onChange(editor?.getHTML() || value);
    }
  };

  // Exposes the public API of the hook for the consuming component.
  return {
    editor,
    isEditable,
    toggleEditable,
  };
};
