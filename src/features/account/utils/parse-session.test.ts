import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeIpAddress, parseSessionInfo } from "@/features/account/utils/parse-session";

// Mock the geoip-lite library to prevent actual database lookups and provide deterministic results.
vi.mock("geoip-lite", () => ({
  lookup: vi.fn((ip: string) => {
    if (ip === "202.1.1.1") {
      return {
        country: "PH",
        region: "Metro Manila",
        city: "Makati",
        timezone: "Asia/Manila",
      };
    }
    return null;
  }),
  default: {
    lookup: vi.fn((ip: string) => {
      if (ip === "202.1.1.1") {
        return {
          country: "PH",
          region: "Metro Manila",
          city: "Makati",
          timezone: "Asia/Manila",
        };
      }
      return null;
    }),
  },
}));

/**
 * Test suite for the `normalizeIpAddress` utility function.
 */
describe("normalizeIpAddress", () => {
  /**
   * Test case to verify that IPv4-mapped IPv6 addresses are correctly stripped of their prefix.
   */
  it("removes ::ffff: prefix from IPv4-mapped IPv6 addresses", () => {
    // Assert: Check that the `::ffff:` prefix is removed to leave a standard IPv4 string.
    expect(normalizeIpAddress("::ffff:192.168.1.1")).toBe("192.168.1.1");
  });

  /**
   * Test case to verify that standard IPv4 addresses remain unmodified.
   */
  it("returns standard IPv4 addresses unchanged", () => {
    // Assert: Verify that a clean IPv4 address is returned exactly as provided.
    expect(normalizeIpAddress("202.1.1.1")).toBe("202.1.1.1");
  });

  /**
   * Test case to verify that localhost addresses for both IPv4 and IPv6 are preserved.
   */
  it("preserves localhost addresses", () => {
    // Assert: Check that loopback addresses are not altered by the normalization logic.
    expect(normalizeIpAddress("127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeIpAddress("::1")).toBe("::1");
  });

  /**
   * Test case to verify that private network IP ranges are not modified.
   */
  it("preserves private network addresses", () => {
    // Assert: Verify that standard private IP ranges are returned unchanged.
    expect(normalizeIpAddress("192.168.1.50")).toBe("192.168.1.50");
    expect(normalizeIpAddress("10.0.0.5")).toBe("10.0.0.5");
    expect(normalizeIpAddress("172.16.0.1")).toBe("172.16.0.1");
  });
});

/**
 * Test suite for the `parseSessionInfo` utility function.
 */
describe("parseSessionInfo", () => {
  // Clear mock history after each test to ensure a clean state for subsequent tests.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify successful parsing of both User Agent and IP-based geolocation data.
   */
  it("parses valid user agent and public IP correctly", async () => {
    // Arrange: Define a standard Chrome User Agent and a mock-compatible IP address.
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const ip = "202.1.1.1";

    // Act: Execute the session info parsing.
    const result = await parseSessionInfo(userAgent, ip);

    // Assert: Verify the returned object contains correctly extracted browser, OS, and location data.
    expect(result).toMatchObject({
      browserName: "Chrome",
      browserVersion: "120.0.0.0",
      osName: "macOS",
      osVersion: "10.15.7",
      country: "PH",
      region: "Metro Manila",
      city: "Makati",
      timezone: "Asia/Manila",
    });
  });

  /**
   * Test case to verify that the function handles IP addresses with no associated geolocation data.
   */
  it("handles unknown IP addresses gracefully (null geo data)", async () => {
    // Arrange: Use a localhost IP which should return no geolocation results.
    const userAgent = "Mozilla/5.0";
    const ip = "127.0.0.1";

    // Act: Execute the session info parsing.
    const result = await parseSessionInfo(userAgent, ip);

    // Assert: Verify that geographic fields are returned as `null` rather than causing an error.
    expect(result.country).toBeNull();
    expect(result.city).toBeNull();
    expect(result.timezone).toBeNull();
  });

  /**
   * Test case to verify that default labels are returned when a User Agent string is unparseable.
   */
  it("returns default values for unparseable user agents", async () => {
    // Arrange: Provide an empty User Agent string.
    const userAgent = "";
    const ip = "127.0.0.1";

    // Act: Execute the session info parsing.
    const result = await parseSessionInfo(userAgent, ip);

    // Assert: Check that fallback strings for browser and OS names are applied.
    expect(result.browserName).toBe("Unknown Browser");
    expect(result.osName).toBe("Unknown OS");
    expect(result.deviceType).toBeNull();
  });

  /**
   * Test case to verify that IP normalization occurs before attempting a geolocation lookup.
   */
  it("handles normalization of IP before geo lookup", async () => {
    // Arrange: Provide an IPv4-mapped IPv6 address that should match the `202.1.1.1` mock.
    const userAgent = "Mozilla/5.0";
    const ip = "::ffff:202.1.1.1";

    // Act: Execute the session info parsing.
    const result = await parseSessionInfo(userAgent, ip);

    // Assert: Verify that the lookup succeeded by checking the returned city and country.
    expect(result.country).toBe("PH");
    expect(result.city).toBe("Makati");
  });

  /**
   * Test case to verify that the function returns a structure even when provided with invalid input types.
   */
  it("returns gracefully degraded object if an exception occurs during parsing", async () => {
    // Act: Pass an invalid IP format to trigger internal handling.
    const fallback = await parseSessionInfo("insignificant-ua-string", "invalid-ip");

    // Assert: Ensure the returned object maintains the expected schema.
    expect(fallback).toHaveProperty("browserName");
    expect(fallback).toHaveProperty("osName");
    expect(fallback.country).toBeNull();
  });

  /**
   * Test case to verify that runtime errors during the geolocation lookup are caught and handled.
   */
  it("catches errors during parsing or lookup and returns default", async () => {
    // Arrange: Force the mocked lookup function to throw a runtime error.
    const lookupMock = (await import("geoip-lite")).lookup;
    vi.mocked(lookupMock).mockImplementationOnce(() => {
      throw new Error("Simulated lookup error");
    });

    // Act: Execute the session info parsing.
    const result = await parseSessionInfo("userAgent", "1.1.1.1");

    // Assert: Check that defaults are returned instead of propagating the error.
    expect(result.browserName).toBe("Unknown Browser");
    expect(result.country).toBeNull();
  });

  /**
   * Test case to verify that a failure to import the geolocation library results in a graceful fallback.
   */
  it("handles geoip-lite import failure", async () => {
    // Arrange: Simulate a module loading failure for the `geoip-lite` dependency.
    vi.resetModules();
    vi.doMock("geoip-lite", () => {
      throw new Error("Failed to load");
    });

    // Act: Re-import the utility to trigger the mocked import failure.
    const { parseSessionInfo: localParseSessionInfo } = await import("./parse-session");
    const result = await localParseSessionInfo("ua", "1.1.1.1");

    // Assert: Ensure the function still returns a result with `null` geographic data.
    expect(result.country).toBeNull();
  });
});
