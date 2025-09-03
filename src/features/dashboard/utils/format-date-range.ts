import { format } from "date-fns";
import { DateRange } from "react-day-picker";

/**
 * A utility function to format a date range object from `react-day-picker` into a user-friendly string. 
 * It handles three cases which are no date selected, a single date selected, or a full date range selected.
 *
 * @param range The `DateRange` object, which may be `undefined` or have `undefined` `from`/`to` properties.
 * @returns A formatted string representing the date range, a single date or a placeholder text.
 */
export function formatDateRange(range: DateRange | undefined): string {
  // No start date has been selected. Return the default placeholder.
  if (!range?.from) {
    return "Pick a date";
  }

  // A start date is selected, but no end date. Format and return only the start date.
  if (!range.to) {
    return format(range.from, "LLL dd, y");
  }

  // Both a start and end date are selected. Format and return the full range string.
  return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
}
