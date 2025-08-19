/**
 * A utility function to format geographical data into a single, human-readable string.
 * It filters out any null or empty parts and joins the remaining parts with commas.
 *
 * @param city The city name, or null.
 * @param region The region or state name, or null.
 * @param country The country name, or null.
 * @returns A formatted location string or "Unknown Location".
 */
export function formatLocation(
  city: string | null,
  region: string | null,
  country: string | null
): string {
  const parts = [city, region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

/**
 * A utility function to combine a browser's name and version into a single string.
 *
 * @param name The name of the browser.
 * @param version The version of the browser.
 * @returns A formatted browser string.
 */
export function formatBrowser(name: string, version: string): string {
  return version ? `${name} ${version}` : name;
}

/**
 * A utility function to combine an operating system's name and version into a single string.
 *
 * @param name The name of the OS.
 * @param version The version of the OS.
 * @returns A formatted OS string.
 */
export function formatOperatingSystem(name: string, version: string): string {
  return version ? `${name} ${version}` : name;
}

/**
 * A complex utility function to determine a user-friendly device name.
 * It uses a prioritized heuristic, checking for specific model/vendor data first,
 * then falling back to OS and user agent string analysis to make an educated guess.
 *
 * @returns A formatted device string.
 */
export function formatDevice(
  deviceType: string | null,
  deviceVendor: string | null,
  deviceModel: string | null,
  browserName: string,
  osName: string,
  userAgent?: string
): string {
  /** A helper to determine if a given device name string is meaningful. */
  const isValidDeviceName = (name: string | null): boolean => {
    // A valid name is not null, longer than 2 characters, and not just a single capital letter.
    return name !== null && name.length > 2 && !name.match(/^[A-Z]$/);
  };

  // Prioritize specific model and vendor information if available and valid.
  if (isValidDeviceName(deviceModel)) {
    return deviceVendor && isValidDeviceName(deviceVendor)
      ? `${deviceVendor} ${deviceModel}`
      : deviceModel!;
  }

  if (isValidDeviceName(deviceVendor)) {
    return deviceVendor!;
  }

  if (deviceType && deviceType.length > 2) {
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  }

  // Fallback heuristics based on OS and user agent string analysis.
  const lowerBrowser = browserName.toLowerCase();
  const lowerOS = osName.toLowerCase();
  const lowerUserAgent = userAgent?.toLowerCase() || "";

  if (lowerOS.includes("android")) {
    // Check for common Android device manufacturers in the user agent string.
    if (lowerUserAgent.includes("samsung") || lowerUserAgent.includes("sm-"))
      return "Samsung Device";
    if (lowerUserAgent.includes("huawei") || lowerUserAgent.includes("honor"))
      return "Huawei Device";
    if (
      lowerUserAgent.includes("xiaomi") ||
      lowerUserAgent.includes("mi ") ||
      lowerUserAgent.includes("redmi")
    )
      return "Xiaomi Device";
    if (lowerUserAgent.includes("oppo")) return "OPPO Device";
    if (lowerUserAgent.includes("vivo")) return "Vivo Device";
    if (lowerUserAgent.includes("oneplus")) return "OnePlus Device";
    if (lowerUserAgent.includes("pixel")) return "Google Pixel";
    if (lowerUserAgent.includes("lg-") || lowerUserAgent.includes("lge")) return "LG Device";
    if (lowerUserAgent.includes("sony")) return "Sony Device";
    if (lowerUserAgent.includes("motorola") || lowerUserAgent.includes("moto"))
      return "Motorola Device";
    if (lowerUserAgent.includes("realme")) return "Realme Device";
    if (lowerUserAgent.includes("tecno")) return "Tecno Device";
    if (lowerUserAgent.includes("infinix")) return "Infinix Device";

    // Fallback for other Android manufacturers.
    if (lowerBrowser.includes("samsung")) return "Samsung Device";
    if (lowerBrowser.includes("huawei")) return "Huawei Device";
    return "Android Device";
  }

  if (lowerOS.includes("ios")) {
    if (lowerBrowser.includes("crios") || lowerBrowser.includes("chrome")) return "iPhone/iPad";
    return "iPhone/iPad";
  }

  // Generic desktop OS detection.
  if (
    lowerOS.includes("windows") ||
    lowerOS.includes("mac") ||
    lowerOS.includes("darwin") ||
    lowerOS.includes("linux")
  ) {
    return "Desktop";
  }

  // Broader fallbacks based on browser name.
  if (lowerBrowser.includes("mobile") || lowerBrowser.includes("android")) {
    return "Mobile Device";
  }

  if (lowerBrowser.includes("tablet") || lowerBrowser.includes("ipad")) {
    return "Tablet Device";
  }

  // The final fallback for any unrecognized device type.
  return "Desktop";
}

/**
 * A utility function to determine if a session was active within the last 5 minutes.
 * @param lastActiveAt The timestamp of the session's last activity.
 * @returns `true` if the session is considered currently active, `false` otherwise.
 */
export function isSessionActive(lastActiveAt: Date): boolean {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  return lastActiveAt > fiveMinutesAgo;
}
