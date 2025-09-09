import { DateRange } from "react-day-picker";

/**
 * Formats a date object into a `YYYY-MM-DD` string, which is a safe and standard
 * format for use in URL search parameters.
 *
 * @param date The date object to format.
 * @returns A string representing the date in `YYYY-MM-DD` format.
 */
export function formatDateForUrl(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parses a date string in `YYYY-MM-DD` format back into a JavaScript Date object.
 * It includes validation to ensure the string is in the correct format and represents a valid date.
 *
 * @param dateString The date string to parse (expected in `YYYY-MM-DD` format).
 * @returns A valid Date object if parsing is successful, otherwise `null`.
 */
export function parseDateFromUrl(dateString: string): Date | null {
  // A simple regular expression to validate the `YYYY-MM-DD` format.
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return null;
  }

  const date = new Date(dateString);

  // An additional check to ensure the parsed date is not invalid.
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Validates and parses a date range from URL search parameters. It performs multiple
 * checks to ensure the date range is present, correctly formatted, in chronological order,
 * and not in the future.
 *
 * @param startDateParam The 'start' date parameter from the URL search params.
 * @param endDateParam The 'end' date parameter from the URL search params.
 * @returns A `DateRange` object (`{ from: Date, to: Date }`) if the range is valid, otherwise `null`.
 */
export function validateDateRange(
  startDateParam: string | null,
  endDateParam: string | null
): DateRange | null {
  // Ensure both 'start' and 'end' parameters are present.
  if (!startDateParam || !endDateParam) {
    return null;
  }

  // Attempt to parse both date strings into valid Date objects.
  const startDate = parseDateFromUrl(startDateParam);
  const endDate = parseDateFromUrl(endDateParam);

  // Ensure both dates were parsed successfully.
  if (!startDate || !endDate) {
    return null;
  }

  // Validate that the start date is not after the end date.
  if (startDate > endDate) {
    return null;
  }

  // Validate that neither date is in the future.
  const today = new Date();
  // Set time to the end of the day to include today in the valid range.
  today.setHours(23, 59, 59, 999);
  if (startDate > today || endDate > today) {
    return null;
  }

  // If all checks pass, return the valid DateRange object.
  return { from: startDate, to: endDate };
}

/**
 * A utility function to build a `URLSearchParams` object containing a date range.
 * This is useful for constructing URLs for navigation or API requests.
 *
 * @param from The start date of the range.
 * @param to The end date of the range.
 * @returns A `URLSearchParams` object with `start` and `end` keys.
 */
export function buildDateRangeParams(from: Date, to: Date): URLSearchParams {
  const params = new URLSearchParams();
  params.set("start", formatDateForUrl(from));
  params.set("end", formatDateForUrl(to));
  return params;
}
