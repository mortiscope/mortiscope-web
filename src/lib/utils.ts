import { type ClassValue, clsx } from "clsx";
import { UseFormReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import { DetailsFormInput } from "@/features/analyze/schemas/details";
import { DETECTION_CLASS_COLORS, DETERMINISTIC_AVATARS } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A utility function to capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * A utility function to format a URL path segment into a human-readable title.
 */
export function formatPathToTitle(segment?: string): string {
  if (!segment) return "Dashboard";
  // Replaces hyphens with spaces, splits into words, capitalizes each, and rejoins.
  return segment.replace(/-/g, " ").split(" ").map(capitalize).join(" ");
}

/**
 * Selects a deterministic fallback avatar based on the user's ID.
 *
 * @param userId The unique ID of the user.
 * @returns A path to an SVG avatar file.
 */
export function getDeterministicAvatar(userId: string | undefined): string {
  const avatars = DETERMINISTIC_AVATARS;

  if (!userId) {
    return avatars[0];
  }

  // Simple hash function which is the sum of character codes from the user ID
  const sum = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = sum % avatars.length;

  return avatars[index];
}

/**
 * Formats a file size in bytes into a human-readable string.
 *
 * @param bytes The file size in bytes.
 * @param decimals The number of decimal places to include (default is 2).
 * @returns A formatted string representing the file size.
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

type LocationLevel = "province" | "city" | "barangay";

/**
 * Resets dependent location fields in both state and react-hook-form.
 *
 * @param form - The react-hook-form instance.
 * @param levelsToReset - An array of location levels to reset.
 * @param setCodeFns - An object with optional state setters for 'province', 'city', and 'barangay' codes.
 */
export function resetLocationFields(
  form: UseFormReturn<DetailsFormInput>,
  levelsToReset: LocationLevel[],
  setCodeFns: Partial<Record<LocationLevel, (val: string | null) => void>>
): void {
  levelsToReset.forEach((level) => {
    form.setValue(`location.${level}`, null);

    const setter = setCodeFns[level];
    if (setter) {
      setter(null);
    }
  });
}

/**
 * Converts a temperature from Fahrenheit to Celsius.
 *
 * @param fahrenheit - The temperature in Fahrenheit.
 * @returns The temperature in Celsius.
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Formats a Date object into a more readable string format.
 *
 * @param date - The Date object to format.
 * @returns A formatted string representation of the date.
 */
export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    // Return a sensible fallback for invalid dates
    return "Invalid Date";
  }

  // Uses the Intl.DateTimeFormat API for localized date formatting.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Retrieves the color for a given detection class name.
 *
 * @param className - The name of the detection class.
 * @returns A hex color code as a string.
 */
export function getColorForClass(className: string): string {
  return DETECTION_CLASS_COLORS[className] || DETECTION_CLASS_COLORS.default;
}

/**
 * Formats a detection class label into a human-readable title.
 *
 * @param label - The raw label string from the database.
 * @returns A formatted, capitalized string.
 */
export function formatLabel(label: string): string {
  if (!label) return "";
  return label.replace(/_/g, " ").split(" ").map(capitalize).join(" ");
}

/**
 * Formats a confidence score (0-1) into a percentage string.
 *
 * @param confidence - The confidence score as a number.
 * @returns A formatted string with two decimal places and a percent sign.
 */
export function formatConfidence(confidence: number): string {
  if (typeof confidence !== "number") return "N/A";
  return `${(confidence * 100).toFixed(2)}%`;
}

/**
 * Converts a total number of minutes into a human-readable string.
 *
 * @param totalMinutes - The total PMI in minutes.
 * @returns A formatted, interpretable string.
 */
export function formatPmiToInterpretableString(totalMinutes: number | null | undefined): string {
  if (typeof totalMinutes !== "number" || totalMinutes <= 0) {
    return "No duration available.";
  }

  const days = Math.floor(totalMinutes / 1440);
  const remainingMinutesAfterDays = totalMinutes % 1440;
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const minutes = Math.round(remainingMinutesAfterDays % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);

  if (parts.length === 0) return "Less than a minute.";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(" and ");

  return parts.slice(0, -1).join(", ") + ", and " + parts.slice(-1);
}
