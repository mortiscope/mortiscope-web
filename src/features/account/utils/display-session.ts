/**
 * A utility function to extract just the browser name from a full browser string.
 * @param browser The full browser string.
 * @returns The extracted browser name.
 */
export const getBrowserName = (browser: string): string => {
  return browser.replace(/\s+[\d.]+.*$/, "").trim() || browser;
};

/**
 * A utility function to shorten a full location string to just "City, Province".
 * @param location The full location string.
 * @returns A shortened location string.
 */
export const getCityProvince = (location: string): string => {
  if (location === "Unknown Location") return "Unknown Location";
  const parts = location.split(", ");
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return location;
};
