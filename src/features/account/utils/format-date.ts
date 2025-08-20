/**
 * A utility function to format a date into a full, readable string.
 * @param date The date object to format.
 * @returns A formatted date and time string.
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * A utility function to format a date into a user-friendly relative time string.
 * It falls back to the full date format for older dates.
 * @param date The date object to format.
 * @returns A formatted relative time string.
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  // For dates older than 30 days, show the full date.
  return formatDate(date);
};
