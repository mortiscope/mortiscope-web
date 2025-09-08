import { escapeRegExp } from "@/features/dashboard/utils/highlight-text";

interface HighlightedTextProps {
  text: string;
  highlight: string;
}

/**
 * A component that highlights matching text within a string.
 * Used for search result highlighting in table cells.
 *
 * @param text - The full text to display
 * @param highlight - The search term to highlight within the text
 */
export const HighlightedText = ({ text, highlight }: HighlightedTextProps) => {
  if (!highlight || !text) return <>{text}</>;

  try {
    const escapedHighlight = escapeRegExp(highlight);
    const parts = text.split(new RegExp(`(${escapedHighlight})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={i}
              className="rounded-[2px] bg-emerald-200 box-decoration-clone px-0.5 text-slate-900"
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch {
    // Fallback if regex fails
    return <>{text}</>;
  }
};

HighlightedText.displayName = "HighlightedText";
