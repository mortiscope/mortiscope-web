import { type Editor } from "@tiptap/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { CaseNoteEditor } from "@/features/cases/components/case-note-editor";
import { useCaseNoteEditor } from "@/features/cases/hooks/use-case-note-editor";

// Mock the custom hook responsible for managing the Tiptap editor state and actions.
vi.mock("@/features/cases/hooks/use-case-note-editor");

// Mock the toolbar component to verify prop passing and interaction.
vi.mock("@/features/cases/components/note-editor-toolbar", () => ({
  NoteEditorToolbar: (props: { isEditable: boolean; toggleEditable: () => void }) => (
    <div data-testid="mock-toolbar">
      Toolbar - Editable: {String(props.isEditable)}
      <button onClick={props.toggleEditable}>Toggle Edit</button>
    </div>
  ),
}));

// Mock the content area component to verify prop passing.
vi.mock("@/features/cases/components/note-editor-content-area", () => ({
  NoteEditorContentArea: (props: { isEditable: boolean }) => (
    <div data-testid="mock-content-area">Content Area - Editable: {String(props.isEditable)}</div>
  ),
}));

// Mock the loading component used while the Tiptap editor is initializing.
vi.mock("@/features/cases/components/note-editor-loading", () => ({
  NoteEditorLoading: ({ className }: { className?: string }) => (
    <div data-testid="mock-loading" className={className}>
      Loading...
    </div>
  ),
}));

// Mock the tooltip provider wrapper component.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Define default properties for the `CaseNoteEditor` component.
const defaultProps = {
  value: "<p>Initial content</p>",
  onChange: vi.fn(),
  className: "custom-class",
};

// Define a minimal mock Tiptap editor instance for tests where the editor is initialized.
const mockEditorInstance = {
  commands: {},
  isActive: vi.fn(),
};

/**
 * Test suite for the `CaseNoteEditor` component.
 */
describe("CaseNoteEditor", () => {
  beforeEach(() => {
    // Reset all mock function calls before each test execution.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the loading state component is rendered when the editor hook returns a null editor instance.
   */
  it("renders the loading state when the editor is not yet initialized", () => {
    // Arrange: Mock the hook to indicate the editor is not yet ready.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: null,
      isEditable: false,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component.
    render(<CaseNoteEditor {...defaultProps} />);

    // Assert: Check for the presence of the mock loading component and the absence of the toolbar and content area.
    expect(screen.getByTestId("mock-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-content-area")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a custom `className` prop is correctly applied to the loading component when it is rendered.
   */
  it("applies the custom className to the loading component", () => {
    // Arrange: Mock the hook to indicate loading state.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: null,
      isEditable: false,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component with a specific custom class.
    render(<CaseNoteEditor {...defaultProps} className="test-loading-class" />);

    // Assert: Check that the loading component has the specified custom class.
    const loading = screen.getByTestId("mock-loading");
    expect(loading).toHaveClass("test-loading-class");
  });

  /**
   * Test case to verify that the toolbar and content components are rendered once the editor is successfully initialized.
   */
  it("renders the editor toolbar and content area when initialized", () => {
    // Arrange: Mock the hook to return a mock editor instance, simulating initialization success.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: mockEditorInstance as unknown as Editor,
      isEditable: true,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component.
    render(<CaseNoteEditor {...defaultProps} />);

    // Assert: Check for the absence of the loading component and the presence of the toolbar and content area.
    expect(screen.queryByTestId("mock-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-content-area")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `isEditable` state from the hook is correctly propagated to the child components.
   */
  it("passes the isEditable state correctly to children", () => {
    // Arrange: Mock the hook to return `isEditable: false`.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: mockEditorInstance as unknown as Editor,
      isEditable: false,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component.
    render(<CaseNoteEditor {...defaultProps} />);

    // Assert: Check that both the toolbar and content area display the correct `false` editable state.
    expect(screen.getByTestId("mock-toolbar")).toHaveTextContent("Editable: false");
    expect(screen.getByTestId("mock-content-area")).toHaveTextContent("Editable: false");
  });

  /**
   * Test case to verify that the `toggleEditable` function passed down to the toolbar correctly triggers the hook's implementation.
   */
  it("passes the toggleEditable function to the toolbar", async () => {
    // Arrange: Define a spy for the toggle function.
    const toggleMock = vi.fn();
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: mockEditorInstance as unknown as Editor,
      isEditable: true,
      toggleEditable: toggleMock,
    });

    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<CaseNoteEditor {...defaultProps} />);

    // Act: Click the mock toggle button provided by the toolbar.
    const toggleButton = screen.getByText("Toggle Edit");
    await user.click(toggleButton);

    // Assert: Check that the mock toggle function was called.
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `useCaseNoteEditor` hook is initialized with the correct `value` and `onChange` props.
   */
  it("initializes the hook with correct props", () => {
    // Arrange: Mock the hook to return an initialized state.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: mockEditorInstance as unknown as Editor,
      isEditable: true,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component.
    render(<CaseNoteEditor {...defaultProps} />);

    // Assert: Check that the `useCaseNoteEditor` hook was called with the component's props.
    expect(useCaseNoteEditor).toHaveBeenCalledWith({
      value: defaultProps.value,
      onChange: defaultProps.onChange,
    });
  });

  /**
   * Test case to verify that a custom `className` prop is correctly applied to the component's main wrapper element.
   */
  it("applies custom className to the main container", () => {
    // Arrange: Mock the hook to return an initialized state.
    vi.mocked(useCaseNoteEditor).mockReturnValue({
      editor: mockEditorInstance as unknown as Editor,
      isEditable: true,
      toggleEditable: vi.fn(),
    });

    // Arrange: Render the component with a custom class.
    const { container } = render(<CaseNoteEditor {...defaultProps} className="custom-style" />);

    // Assert: Check that the root element has both the base classes and the custom class.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex flex-col");
    expect(wrapper).toHaveClass("custom-style");
  });
});
