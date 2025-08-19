import { UAParser } from "ua-parser-js";

/**
 * Defines the shape of the result from the `geoip-lite` lookup.
 */
type GeoIPResult = {
  country: string;
  region: string;
  city: string;
  timezone: string;
  ll?: [number, number];
  metro?: number;
  area?: number;
} | null;

/** A promise-based singleton to lazily load the `geoip-lite` module. */
let geoipPromise: Promise<{ lookup(ip: string): GeoIPResult }> | null = null;

/**
 * Asynchronously loads and returns the `geoip-lite` module.
 * This function ensures the module is only imported once, improving performance.
 * It includes a fallback in case the module fails to load.
 */
async function getGeoIP() {
  if (!geoipPromise) {
    geoipPromise = (async () => {
      try {
        // Dynamically import the module.
        const geoipModule = await import("geoip-lite");
        return geoipModule;
      } catch {
        // If the import fails, return a mock object to prevent crashes.
        return {
          lookup: (): GeoIPResult => null,
        };
      }
    })();
  }
  return geoipPromise;
}

/**
 * Defines the shape of the parsed session information.
 */
export interface ParsedSessionInfo {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

/**
 * Normalizes an IP address by removing common prefixes for IPv4-mapped IPv6 addresses.
 * It intentionally does not alter local/private IP addresses.
 * @param ipAddress The raw IP address.
 * @returns A normalized IP address string.
 */
export function normalizeIpAddress(ipAddress: string): string {
  // Handle IPv4-mapped IPv6 addresses.
  if (ipAddress.startsWith("::ffff:")) {
    return ipAddress.replace("::ffff:", "");
  }

  // Do not normalize local or private IP ranges.
  if (
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("172.")
  ) {
    return ipAddress;
  }

  return ipAddress;
}

/**
 * Parses a user agent string and IP address to extract detailed session information,
 * including device, browser, OS, and geographical location.
 * @param userAgent The full user agent string from the request.
 * @param ipAddress The user's IP address.
 * @returns A promise resolving to a `ParsedSessionInfo` object.
 */
export async function parseSessionInfo(
  userAgent: string,
  ipAddress: string
): Promise<ParsedSessionInfo> {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const normalizedIp = normalizeIpAddress(ipAddress);

    const geoip = await getGeoIP();
    const geo = geoip.lookup(normalizedIp);

    const sessionInfo = {
      browserName: result.browser.name || "Unknown Browser",
      browserVersion: result.browser.version || "",
      osName: result.os.name || "Unknown OS",
      osVersion: result.os.version || "",
      deviceType: result.device.type || null,
      deviceVendor: result.device.vendor || null,
      deviceModel: result.device.model || null,
      country: geo?.country || null,
      region: geo?.region || null,
      city: geo?.city || null,
      timezone: geo?.timezone || null,
    };

    return sessionInfo;
  } catch {
    // Return a default object on any parsing failure to ensure graceful degradation.
    return {
      browserName: "Unknown Browser",
      browserVersion: "",
      osName: "Unknown OS",
      osVersion: "",
      deviceType: null,
      deviceVendor: null,
      deviceModel: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
    };
  }
}
