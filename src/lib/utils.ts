import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { DETERMINISTIC_AVATARS } from "@/lib/constants";

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
