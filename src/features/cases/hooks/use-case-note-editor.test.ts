import { useEditor } from "@tiptap/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useCaseNoteEditor } from "@/features/cases/hooks/use-case-note-editor";

// Mock the core editor hook from Tiptap.
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(),
}));

// Mock Tiptap extensions used in the editor configuration.
vi.mock("@tiptap/starter-kit", () => ({ default: { configure: vi.fn().mockReturnThis() } }));
vi.mock("@tiptap/extension-typography", () => ({ default: {} }));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));
vi.mock("@tiptap/extension-bullet-list", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-ordered-list", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-list-item", () => ({ default: {} }));
vi.mock("@tiptap/extension-heading", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-blockquote", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-task-list", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-task-item", () => ({ default: { configure: vi.fn() } }));

// Defines the minimal interface for a mock Tiptap editor instance.
interface MockEditor {
  getHTML: () => string;
  setEditable: (editable: boolean) => void;
  commands: {
    setContent: (content: string, options?: { emitUpdate: boolean }) => void;
  };
  chain: () => {
    focus: () => {
      run: () => void;
    };
  };
  isDestroyed: boolean;
}

// Defines the options type passed to the mocked `useEditor`.
interface UseEditorOptions {
  content?: string;
  onUpdate?: (props: { editor: MockEditor }) => void;
}

/**
 * Test suite for the `useCaseNoteEditor` hook.
 */
describe("useCaseNoteEditor", () => {
  // Variable to hold the mock editor instance during tests.
  let mockEditorInstance: MockEditor;
  // Variable to capture the options passed to the mocked `useEditor` hook.
  let useEditorOptions: UseEditorOptions;

  // Setup runs before each test.
  beforeEach(() => {
    // Arrange: Clear execution history of all spies and mocks.
    vi.clearAllMocks();

    // Arrange: Define the full mock editor instance with necessary methods and properties.
    mockEditorInstance = {
      getHTML: vi.fn().mockReturnValue("<p>Initial Content</p>"),
      setEditable: vi.fn(),
      commands: {
        setContent: vi.fn(),
      },
      chain: vi.fn().mockReturnValue({
        focus: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
      isDestroyed: false,
    };

    // Arrange: Mock `useEditor` to return the mock instance and capture the options passed to it.
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (options: UseEditorOptions) => {
        useEditorOptions = options;
        return mockEditorInstance;
      }
    );
  });

  // Teardown runs after each test.
  afterEach(() => {
    // Arrange: Restore all original mock implementations.
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the editor initializes correctly with the content provided via props.
   */
  it("initializes the editor with correct content", () => {
    // Act: Render the hook with initial content.
    const { result } = renderHook(() =>
      useCaseNoteEditor({ value: "<p>Initial Content</p>", onChange: vi.fn() })
    );

    // Assert: Check that the editor instance is defined.
    expect(result.current.editor).toBeDefined();
    // Assert: Check that the initial content was passed to the underlying `useEditor` hook options.
    expect(useEditorOptions.content).toBe("<p>Initial Content</p>");
    // Assert: Check that the editing state is initialized to false (view mode).
    expect(result.current.isEditable).toBe(false);
  });

  /**
   * Test case to verify that the `onChange` prop is called correctly when the editor's content is updated internally.
   */
  it("calls onChange when editor content updates", () => {
    // Arrange: Define a mock function for the `onChange` prop.
    const onChangeMock = vi.fn();
    // Arrange: Render the hook.
    renderHook(() =>
      useCaseNoteEditor({ value: "<p>Initial Content</p>", onChange: onChangeMock })
    );

    // Act: Simulate an editor update event using the captured `onUpdate` callback.
    act(() => {
      if (useEditorOptions.onUpdate) {
        // Arrange: Mock the editor's `getHTML` to return new content during the update event.
        (mockEditorInstance.getHTML as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
          "<p>New Content</p>"
        );
        useEditorOptions.onUpdate({ editor: mockEditorInstance });
      }
    });

    // Assert: Check that the `onChange` mock was called with the new content from the editor.
    expect(onChangeMock).toHaveBeenCalledWith("<p>New Content</p>");
  });

  /**
   * Test case to verify that when the external `value` prop changes, the editor content is updated via `setContent`.
   */
  it("synchronizes editor content when 'value' prop changes externally", () => {
    // Arrange: Render the hook and capture the `rerender` function.
    const { rerender } = renderHook((props) => useCaseNoteEditor(props), {
      initialProps: { value: "<p>Initial Content</p>", onChange: vi.fn() },
    });

    // Arrange: Mock `getHTML` to return the current content.
    (mockEditorInstance.getHTML as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "<p>Initial Content</p>"
    );

    // Act: Rerender the hook with a different `value` prop.
    rerender({ value: "<p>Updated from Server</p>", onChange: vi.fn() });

    // Assert: Check that `setContent` was called with the new value and `emitUpdate: false` to prevent redundant updates.
    expect(mockEditorInstance.commands.setContent).toHaveBeenCalledWith(
      "<p>Updated from Server</p>",
      { emitUpdate: false }
    );
  });

  /**
   * Test case to verify that no synchronization occurs if the external `value` prop is identical to the editor's current content.
   */
  it("does NOT set content if 'value' prop matches internal editor state", () => {
    // Arrange: Render the hook and capture the `rerender` function.
    const { rerender } = renderHook((props) => useCaseNoteEditor(props), {
      initialProps: { value: "<p>Same Content</p>", onChange: vi.fn() },
    });

    // Arrange: Clear mocks before the assertion period starts.
    vi.clearAllMocks();

    // Arrange: Mock `getHTML` to return content identical to the `value` prop.
    (mockEditorInstance.getHTML as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "<p>Same Content</p>"
    );

    // Act: Rerender the hook with the same `value` prop.
    rerender({ value: "<p>Same Content</p>", onChange: vi.fn() });

    // Assert: Check that `setContent` was not called, avoiding unnecessary DOM manipulation.
    expect(mockEditorInstance.commands.setContent).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the `toggleEditable` function correctly switches the editor's state and calls related commands.
   */
  it("toggles editable state and focuses editor", () => {
    // Arrange: Define a mock function for `onChange`.
    const onChangeMock = vi.fn();
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useCaseNoteEditor({ value: "<p>Content</p>", onChange: onChangeMock })
    );

    // Assert: Check the initial state is non-editable.
    expect(result.current.isEditable).toBe(false);

    // Act: Toggle to editable state.
    act(() => {
      result.current.toggleEditable();
    });

    // Assert: Verify the state change and mock calls for enabling editing and focusing.
    expect(result.current.isEditable).toBe(true);
    expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(true);
    expect(mockEditorInstance.chain().focus).toHaveBeenCalled();
    // The `onChange` is called when toggling out of view mode to sync the content if a user was making changes.
    expect(onChangeMock).toHaveBeenCalled();

    // Act: Toggle back to non-editable state.
    act(() => {
      result.current.toggleEditable();
    });

    // Assert: Verify the state change and mock call for disabling editing.
    expect(result.current.isEditable).toBe(false);
    expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to ensure the hook handles a null editor instance (e.g., during unmount or loading) without crashing.
   */
  it("handles null editor instance safely", () => {
    // Arrange: Mock `useEditor` to return null.
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

    // Act: Render the hook.
    const { result } = renderHook(() =>
      useCaseNoteEditor({ value: "<p>Content</p>", onChange: vi.fn() })
    );

    // Assert: Check that the editor is null.
    expect(result.current.editor).toBeNull();
    expect(result.current.isEditable).toBe(false);

    // Act: Attempt to toggle the state, which should not cause an error despite the null editor.
    act(() => {
      result.current.toggleEditable();
    });

    // Assert: Check that the internal state changed, even if the editor commands could not be called.
    expect(result.current.isEditable).toBe(true);
  });

  /**
   * Test case to verify that content synchronization is skipped if the editor instance has been destroyed.
   */
  it("does not sync content if editor is destroyed", () => {
    // Arrange: Mock the editor instance to indicate it is destroyed.
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockEditorInstance,
      isDestroyed: true,
      getHTML: vi.fn().mockReturnValue("<p>Old Content</p>"),
    });

    // Arrange: Render the hook.
    const { rerender } = renderHook((props) => useCaseNoteEditor(props), {
      initialProps: { value: "<p>Old Content</p>", onChange: vi.fn() },
    });

    // Act: Rerender with new external content.
    rerender({ value: "<p>New Content</p>", onChange: vi.fn() });

    // Assert: Check that `setContent` was not called because of the `isDestroyed` flag.
    expect(mockEditorInstance.commands.setContent).not.toHaveBeenCalled();
  });
});
