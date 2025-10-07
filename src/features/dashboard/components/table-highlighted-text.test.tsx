import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HighlightedText } from "@/features/dashboard/components/table-highlighted-text";
import { escapeRegExp } from "@/features/dashboard/utils/highlight-text";

// Mock the regex escape utility to ensure special characters are handled safely during testing.
vi.mock("@/features/dashboard/utils/highlight-text", () => ({
  escapeRegExp: vi.fn((str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
}));

/**
 * Test suite for the `HighlightedText` component.
 */
describe("HighlightedText", () => {
  /**
   * Test case to verify that the component returns a standard string when no search term is provided.
   */
  it("renders plain text without changes when highlight prop is empty", () => {
    // Arrange: Render the component with an empty `highlight` string.
    render(<HighlightedText text="Hello World" highlight="" />);

    // Assert: Verify the full text is present and no highlighting spans exist.
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(
      screen.queryByText(
        (_, element) =>
          element?.tagName.toLowerCase() === "span" && element.className.includes("bg-emerald-200")
      )
    ).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component handles empty source text gracefully.
   */
  it("renders plain text without changes when text prop is empty", () => {
    // Arrange: Render the component with an empty `text` string.
    const { container } = render(<HighlightedText text="" highlight="test" />);

    // Assert: Verify that the output is an empty DOM element.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that a specific word within the text is wrapped in a highlight span.
   */
  it("highlights exact matches within the text", () => {
    // Arrange: Render the component with a specific substring to find.
    render(<HighlightedText text="Hello World" highlight="World" />);

    // Assert: Verify the matched word is rendered in a `SPAN` with the emerald background class.
    const highlightedSpan = screen.getByText("World");
    expect(highlightedSpan.tagName).toBe("SPAN");
    expect(highlightedSpan).toHaveClass("bg-emerald-200");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  /**
   * Test case to verify that matches are found regardless of casing differences.
   */
  it("highlights matches case-insensitively", () => {
    // Arrange: Provide an uppercase search term for lowercase text.
    render(<HighlightedText text="Hello world" highlight="WORLD" />);

    // Assert: Check that the lowercase word in the document is still correctly highlighted.
    const highlightedSpan = screen.getByText("world");
    expect(highlightedSpan).toHaveClass("bg-emerald-200");
  });

  /**
   * Test case to verify that all instances of a search term are highlighted simultaneously.
   */
  it("highlights multiple occurrences of the search term", () => {
    // Arrange: Render text containing the search term twice.
    render(<HighlightedText text="test case test" highlight="test" />);

    // Assert: Verify that two distinct elements are found with the highlight styling.
    const highlights = screen.getAllByText("test");
    expect(highlights).toHaveLength(2);
    highlights.forEach((el) => {
      expect(el).toHaveClass("bg-emerald-200");
    });
  });

  /**
   * Test case to verify that the component escapes special characters to prevent regex syntax errors.
   */
  it("handles special regex characters in the highlight term correctly", () => {
    // Arrange: Use a search term containing a character often used in regex syntax.
    render(<HighlightedText text="Question?" highlight="?" />);

    // Assert: Verify that the literal character is found and styled.
    const highlightedSpan = screen.getByText("?");
    expect(highlightedSpan).toHaveClass("bg-emerald-200");
    expect(screen.getByText("Question")).toBeInTheDocument();
  });

  /**
   * Test case to verify that partial word matches are still correctly identified and styled.
   */
  it("renders parts of words if they match", () => {
    // Arrange: Search for a prefix that is part of a larger word.
    render(<HighlightedText text="Testing" highlight="Test" />);

    // Assert: Verify that only the matching part is highlighted while the suffix remains plain.
    const highlightedSpan = screen.getByText("Test");
    expect(highlightedSpan).toHaveClass("bg-emerald-200");
    expect(screen.getByText("ing")).toBeInTheDocument();
  });

  /**
   * Test case to verify the fallback mechanism when internal utilities encounter an error.
   */
  it("returns original text if an error occurs during regex generation", () => {
    // Arrange: Force the `escapeRegExp` utility to throw an exception.
    vi.mocked(escapeRegExp).mockImplementationOnce(() => {
      throw new Error("Mock error");
    });

    render(<HighlightedText text="Error Case" highlight="Error" />);

    // Assert: Verify that the component reverts to rendering standard text without crashing.
    expect(screen.getByText("Error Case")).toBeInTheDocument();
    expect(
      screen.queryByText((_, element) => element?.className.includes("bg-emerald-200") ?? false)
    ).not.toBeInTheDocument();
  });
});
