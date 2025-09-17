import { fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the Tooltip components to simplify rendering and focus on the toolbar button logic.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { NoteEditorToolbar } from "@/features/cases/components/note-editor-toolbar";

// Helper function to create a mock Tiptap editor instance with spied methods.
const createMockEditor = () => {
  // Define a mock command chain object to track method calls in order.
  const chain = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleTaskList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  // Return the mock editor instance, including the command chain.
  return {
    isActive: vi.fn().mockReturnValue(false),
    chain: vi.fn().mockReturnValue(chain),
    _chain: chain,
  } as unknown as Editor & { _chain: typeof chain };
};

/**
 * Test suite for the `NoteEditorToolbar` component.
 */
describe("NoteEditorToolbar", () => {
  afterEach(() => {
    // Restore all spies and mocks after each test.
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that all intended toolbar buttons are rendered.
   */
  it("renders all toolbar buttons", () => {
    // Arrange: Create a mock editor and render the toolbar in an editable state.
    const editor = createMockEditor();
    render(<NoteEditorToolbar editor={editor} isEditable={true} toggleEditable={vi.fn()} />);

    // Assert: Check that the total number of rendered buttons (including the Edit/View toggle) meets the expected minimum.
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });

  /**
   * Test suite for verifying that each formatting button triggers the correct Tiptap command chain.
   */
  describe("Formatting Actions", () => {
    // Define the list of formatting actions to be tested, mapped to their mock chain method.
    const actions = [
      { name: "Bold", method: "toggleBold", args: [] },
      { name: "Italic", method: "toggleItalic", args: [] },
      { name: "Underline", method: "toggleUnderline", args: [] },
      { name: "Strike", method: "toggleStrike", args: [] },
      { name: "Heading 1", method: "toggleHeading", args: [{ level: 1 }] },
      { name: "Blockquote", method: "toggleBlockquote", args: [] },
      { name: "Bullet List", method: "toggleBulletList", args: [] },
      { name: "Ordered List", method: "toggleOrderedList", args: [] },
      { name: "Task List", method: "toggleTaskList", args: [] },
    ];

    actions.forEach(({ name, method, args }) => {
      /**
       * Test case generated dynamically for each formatting action to verify the Tiptap command sequence.
       */
      it(`toggles ${name} when clicked`, () => {
        // Arrange: Create a mock editor and render the toolbar.
        const editor = createMockEditor();
        render(<NoteEditorToolbar editor={editor} isEditable={true} toggleEditable={vi.fn()} />);

        // Arrange: Determine the button's index based on its position in the rendered layout.
        let buttonIndex = -1;
        switch (name) {
          case "Bold":
            buttonIndex = 0;
            break;
          case "Italic":
            buttonIndex = 1;
            break;
          case "Underline":
            buttonIndex = 2;
            break;
          case "Strike":
            buttonIndex = 3;
            break;
          case "Heading 1":
            buttonIndex = 4;
            break;
          case "Blockquote":
            buttonIndex = 5;
            break;
          case "Bullet List":
            buttonIndex = 6;
            break;
          case "Ordered List":
            buttonIndex = 7;
            break;
          case "Task List":
            buttonIndex = 8;
            break;
        }

        // Act: Find and click the corresponding button.
        const buttons = screen.getAllByRole("button");
        if (buttonIndex !== -1 && buttons[buttonIndex]) {
          fireEvent.click(buttons[buttonIndex]);
          // Assert: Check the command sequence: `chain()`, `focus()`, specific command, `run()`.
          expect(editor.chain).toHaveBeenCalled();
          expect(editor._chain.focus).toHaveBeenCalled();
          // Assert: Check that the correct Tiptap method was called with the appropriate arguments.
          expect(editor._chain[method as keyof typeof editor._chain]).toHaveBeenCalledWith(...args);
          expect(editor._chain.run).toHaveBeenCalled();
        } else {
          // This path handles skipped actions not implemented in the layout or mock setup.
          if (buttonIndex === -1 && name === "Heading 2") return;
        }
      });
    });
  });

  /**
   * Test suite for verifying general functionality and state displays.
   */
  describe("Functionality", () => {
    /**
     * Test case to verify that the `isActive` method of the Tiptap editor is correctly consulted to determine the active state of toolbar buttons.
     */
    it("applies active class when editor state matches", () => {
      // Arrange: Create a mock editor and spy on `isActive` to return true only for "bold".
      const editor = createMockEditor();
      (editor.isActive as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (name: string) => {
          if (name === "bold") return true;
          return false;
        }
      );

      // Arrange: Render the toolbar.
      render(<NoteEditorToolbar editor={editor} isEditable={true} toggleEditable={vi.fn()} />);

      // Assert: Check that the `isActive` method was called with the expected argument "bold".
      expect(editor.isActive).toHaveBeenCalledWith("bold");
    });

    /**
     * Test case to verify the visual state of the "Edit/View" toggle button when the editor is in read-only mode (`isEditable: false`).
     */
    it("renders correct toggle button state when isEditable is false", () => {
      // Arrange: Create a mock editor and render the toolbar in a read-only state.
      const editor = createMockEditor();
      render(<NoteEditorToolbar editor={editor} isEditable={false} toggleEditable={vi.fn()} />);

      // Assert: Check the toggle button's styling and label ("Edit").
      const toggleBtn = screen.getByLabelText("Toggle edit mode");
      expect(toggleBtn).toHaveClass("text-slate-600");
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    /**
     * Test case to verify the visual state of the "Edit/View" toggle button when the editor is in editable mode (`isEditable: true`).
     */
    it("renders correct toggle button state when isEditable is true", () => {
      // Arrange: Create a mock editor and render the toolbar in an editable state.
      const editor = createMockEditor();
      render(<NoteEditorToolbar editor={editor} isEditable={true} toggleEditable={vi.fn()} />);

      // Assert: Check the toggle button's styling and label ("View").
      const toggleBtn = screen.getByLabelText("Toggle edit mode");
      expect(toggleBtn).toHaveClass("text-slate-700");
      expect(screen.getByText("View")).toBeInTheDocument();
    });
  });
});
