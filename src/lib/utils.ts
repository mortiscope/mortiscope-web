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
