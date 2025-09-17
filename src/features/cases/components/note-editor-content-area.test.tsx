import { type Editor } from "@tiptap/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { NoteEditorContentArea } from "@/features/cases/components/note-editor-content-area";

// Mock the Tiptap `EditorContent` component to verify prop passing and styling without complex Tiptap setup.
vi.mock("@tiptap/react", () => ({
  EditorContent: ({ className }: { className: string }) => (
    <div data-testid="tiptap-editor-content" className={className}>
      Mock Editor Content
    </div>
  ),
}));

// Define a minimal mock Tiptap editor instance as a required prop.
const mockEditor = {
  commands: {},
  isActive: vi.fn(),
} as unknown as Editor;

/**
 * Test suite for the `NoteEditorContentArea` component.
 */
describe("NoteEditorContentArea", () => {
  beforeEach(() => {
    // Reset all mock function calls before each test.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the mocked Tiptap content component is rendered.
   */
  it("renders the Tiptap editor content", () => {
    // Arrange: Render the component.
    render(<NoteEditorContentArea editor={mockEditor} isEditable={true} />);

    // Assert: Check for the presence of the mock Tiptap element and its text content.
    expect(screen.getByTestId("tiptap-editor-content")).toBeInTheDocument();
    expect(screen.getByText("Mock Editor Content")).toBeInTheDocument();
  });

  /**
   * Test case to verify that styles appropriate for an editable state are applied to the wrapper element.
   */
  it("applies 'editable' styles when isEditable is true", () => {
    // Arrange: Render the component in an editable state.
    render(<NoteEditorContentArea editor={mockEditor} isEditable={true} />);

    // Assert: Check the parent element for specific text and heading color classes for editable mode.
    const editorContent = screen.getByTestId("tiptap-editor-content");
    const wrapper = editorContent.parentElement;

    expect(wrapper).toHaveClass("text-slate-800");
    expect(wrapper).toHaveClass("prose-h1:text-slate-800");

    // Assert: Check for the absence of read-only specific classes.
    expect(wrapper).not.toHaveClass("text-slate-500");
  });

  /**
   * Test case to verify that styles appropriate for a read-only state are applied to the wrapper element.
   */
  it("applies 'read-only' styles when isEditable is false", () => {
    // Arrange: Render the component in a read-only state.
    render(<NoteEditorContentArea editor={mockEditor} isEditable={false} />);

    // Assert: Check the parent element for specific text, heading, and blockquote styles for read-only mode.
    const editorContent = screen.getByTestId("tiptap-editor-content");
    const wrapper = editorContent.parentElement;

    expect(wrapper).toHaveClass("text-slate-500");
    expect(wrapper).toHaveClass("prose-h1:text-slate-500");
    expect(wrapper).toHaveClass("prose-blockquote:italic");

    // Assert: Check for the absence of editable specific classes.
    expect(wrapper).not.toHaveClass("text-slate-800");
  });

  /**
   * Test case to verify that base typography and layout classes are always applied regardless of the editable state.
   */
  it("applies base typography classes regardless of mode", () => {
    // Arrange: Render the component in an editable state.
    render(<NoteEditorContentArea editor={mockEditor} isEditable={true} />);

    // Assert: Check the parent element for necessary base CSS utility classes.
    const editorContent = screen.getByTestId("tiptap-editor-content");
    const wrapper = editorContent.parentElement;

    expect(wrapper).toHaveClass("prose");
    expect(wrapper).toHaveClass("prose-sm");
    expect(wrapper).toHaveClass("max-w-none");
  });
});
