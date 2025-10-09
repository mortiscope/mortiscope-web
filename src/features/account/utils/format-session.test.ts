import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatBrowser,
  formatDevice,
  formatLocation,
  formatOperatingSystem,
  isSessionActive,
} from "@/features/account/utils/format-session";

/**
 * Test suite for the `formatLocation` utility function.
 */
describe("formatLocation", () => {
  /**
   * Test case to verify that a full location string is created when city, province, and country are provided.
   */
  it("joins all parts with commas when all are present", () => {
    // Assert: Verify that three valid strings are joined by a comma and a space.
    expect(formatLocation("Makati", "Metro Manila", "Philippines")).toBe(
      "Makati, Metro Manila, Philippines"
    );
  });

  /**
   * Test case to verify that `null` or empty string arguments are omitted from the final output.
   */
  it("filters out null or empty values", () => {
    // Assert: Check various combinations of missing parameters to ensure no extra commas are rendered.
    expect(formatLocation("Makati", null, "Philippines")).toBe("Makati, Philippines");
    expect(formatLocation("Makati", "", "Philippines")).toBe("Makati, Philippines");
    expect(formatLocation(null, "Metro Manila", null)).toBe("Metro Manila");
  });

  /**
   * Test case to verify that a default fallback string is returned when no location data is available.
   */
  it("returns Unknown Location when all parts are missing", () => {
    // Assert: Ensure `null` or empty inputs result in the specific string `Unknown Location`.
    expect(formatLocation(null, null, null)).toBe("Unknown Location");
    expect(formatLocation("", "", "")).toBe("Unknown Location");
  });
});

/**
 * Test suite for the `formatBrowser` utility function.
 */
describe("formatBrowser", () => {
  /**
   * Test case to verify that the browser name and version are concatenated with a space.
   */
  it("combines name and version", () => {
    // Assert: Check that `Chrome` and `120.0` are merged into `Chrome 120.0`.
    expect(formatBrowser("Chrome", "120.0")).toBe("Chrome 120.0");
  });

  /**
   * Test case to verify that only the name is returned if the version parameter is an empty string.
   */
  it("returns only name if version is empty", () => {
    // Assert: Ensure no trailing space is added when the version is missing.
    expect(formatBrowser("Safari", "")).toBe("Safari");
  });
});

/**
 * Test suite for the `formatOperatingSystem` utility function.
 */
describe("formatOperatingSystem", () => {
  /**
   * Test case to verify that the OS name and version are concatenated with a space.
   */
  it("combines name and version", () => {
    // Assert: Check that `macOS` and `14.0` are merged into `macOS 14.0`.
    expect(formatOperatingSystem("macOS", "14.0")).toBe("macOS 14.0");
  });

  /**
   * Test case to verify that only the OS name is returned if the version parameter is missing.
   */
  it("returns only name if version is empty", () => {
    // Assert: Ensure no trailing space is added when the version is an empty string.
    expect(formatOperatingSystem("Windows", "")).toBe("Windows");
  });
});

/**
 * Test suite for the `formatDevice` utility function.
 */
describe("formatDevice", () => {
  // Define constants to satisfy the function signature during device-specific tests.
  const defaultBrowser = "Chrome";
  const defaultOS = "Android";

  /**
   * Test case to verify that vendor and model names are joined when both are provided and valid.
   */
  it("returns formatted vendor and model if both are valid", () => {
    // Act: Pass specific manufacturer and model details.
    const result = formatDevice(null, "Samsung", "Galaxy S23", defaultBrowser, defaultOS);

    // Assert: Verify the resulting string contains both parts.
    expect(result).toBe("Samsung Galaxy S23");
  });

  /**
   * Test case to verify that the vendor name is ignored if it is too short or deemed invalid.
   */
  it("returns only model if vendor is invalid or short", () => {
    // Act: Pass a short vendor name like `LG`.
    const result = formatDevice(null, "LG", "V60 ThinQ", defaultBrowser, defaultOS);

    // Assert: Verify that only the model `V60 ThinQ` is returned.
    expect(result).toBe("V60 ThinQ");
  });

  /**
   * Test case to verify that only the vendor name is returned if the model name is unavailable.
   */
  it("returns vendor if model is invalid", () => {
    // Act: Pass a valid vendor but a `null` model.
    const result = formatDevice(null, "OnePlus", null, defaultBrowser, defaultOS);

    // Assert: Verify that only `OnePlus` is returned.
    expect(result).toBe("OnePlus");
  });

  /**
   * Test case to verify that the device type is used as a fallback when vendor and model are missing.
   */
  it("falls back to device type if vendor and model are missing", () => {
    // Act: Provide a device type of `tablet` while other identifiers are `null`.
    const result = formatDevice("tablet", null, null, defaultBrowser, defaultOS);

    // Assert: Verify the type is capitalized and returned.
    expect(result).toBe("Tablet");
  });

  /**
   * Sub-suite for testing logic that identifies Android manufacturers from the User Agent.
   */
  describe("Android Heuristics", () => {
    /**
     * Test case to verify detection of Samsung devices via model codes in the User Agent.
     */
    it("detects Samsung devices from User Agent", () => {
      // Assert: Check that the `SM-` prefix in the User Agent triggers the `Samsung Device` label.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 13; SM-S918B)"
        )
      ).toBe("Samsung Device");
    });

    /**
     * Test case to verify detection of Google Pixel devices from the User Agent string.
     */
    it("detects Pixel devices from User Agent", () => {
      // Assert: Check that the word `Pixel` in the User Agent triggers the `Google Pixel` label.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 13; Pixel 6)"
        )
      ).toBe("Google Pixel");
    });

    /**
     * Test case to verify detection of Huawei devices from the User Agent string.
     */
    it("detects Huawei devices from User Agent", () => {
      // Assert: Check that the word `HUAWEI` in the User Agent triggers the `Huawei Device` label.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 10; LYA-L29 Build/HUAWEILYA-L29)"
        )
      ).toBe("Huawei Device");
    });

    /**
     * Test case to verify detection of Xiaomi devices from the User Agent string.
     */
    it("detects Xiaomi devices from User Agent", () => {
      // Assert: Check that the word `Redmi` in the User Agent triggers the `Xiaomi Device` label.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 10; Redmi Note 9 Pro)"
        )
      ).toBe("Xiaomi Device");
    });

    /**
     * Test case to verify detection of Motorola devices from the User Agent string.
     */
    it("detects Motorola devices from User Agent", () => {
      // Assert: Check that the word `moto` in the User Agent triggers the `Motorola Device` label.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 10; moto g(8))"
        )
      ).toBe("Motorola Device");
    });

    /**
     * Test case to verify detection of various other Android brands through a looped list of manufacturers.
     */
    it("detects other Android manufacturers from User Agent", () => {
      // Arrange: Define a mapping of User Agent fragments to expected display names.
      const manufacturers = [
        { ua: "oppo", expected: "OPPO Device" },
        { ua: "vivo", expected: "Vivo Device" },
        { ua: "oneplus", expected: "OnePlus Device" },
        { ua: "lg-", expected: "LG Device" },
        { ua: "sony", expected: "Sony Device" },
        { ua: "realme", expected: "Realme Device" },
        { ua: "tecno", expected: "Tecno Device" },
        { ua: "infinix", expected: "Infinix Device" },
      ];

      // Assert: Iterate through the manufacturers and verify each is correctly identified.
      manufacturers.forEach(({ ua, expected }) => {
        expect(
          formatDevice(
            null,
            null,
            null,
            defaultBrowser,
            "Android",
            `Mozilla/5.0 (Linux; Android 10; ${ua})`
          )
        ).toBe(expected);
      });
    });

    /**
     * Test case to verify that the manufacturer is inferred if the browser name is brand-specific.
     */
    it("falls back to Samsung Device if browser name indicates Samsung", () => {
      // Assert: Ensure `Samsung Browser` triggers the `Samsung Device` result even without User Agent data.
      expect(formatDevice(null, null, null, "Samsung Browser", "Android", "")).toBe(
        "Samsung Device"
      );
    });

    /**
     * Test case to verify that the manufacturer is inferred if the browser name is brand-specific.
     */
    it("falls back to Huawei Device if browser name indicates Huawei", () => {
      // Assert: Ensure `Huawei Browser` triggers the `Huawei Device` result even without User Agent data.
      expect(formatDevice(null, null, null, "Huawei Browser", "Android", "")).toBe("Huawei Device");
    });

    /**
     * Test case to verify the general fallback for Android devices when no specific brand is detected.
     */
    it("falls back to Generic Android Device if manufacturer unrecognized", () => {
      // Assert: Ensure that if the OS is `Android`, the function returns `Android Device` as a last resort.
      expect(
        formatDevice(
          null,
          null,
          null,
          defaultBrowser,
          "Android",
          "Mozilla/5.0 (Linux; Android 10; Unknown)"
        )
      ).toBe("Android Device");
    });
  });

  /**
   * Sub-suite for testing identification of Apple mobile devices.
   */
  describe("iOS Heuristics", () => {
    /**
     * Test case to verify that iOS devices are labeled as iPhone/iPad regardless of the specific browser used.
     */
    it("returns iPhone/iPad for iOS devices with Chrome", () => {
      // Assert: Check that `Chrome` on `iOS` is identified as an Apple mobile device.
      expect(formatDevice(null, null, null, "Chrome", "iOS", "Mozilla/5.0 (iPhone)")).toBe(
        "iPhone/iPad"
      );
    });

    /**
     * Test case to verify that iOS devices are labeled as iPhone/iPad when using the default Safari browser.
     */
    it("returns iPhone/iPad for iOS devices", () => {
      // Assert: Check that `Mobile Safari` on `iOS` is identified as an Apple mobile device.
      expect(formatDevice(null, null, null, "Mobile Safari", "iOS", "Mozilla/5.0 (iPhone)")).toBe(
        "iPhone/iPad"
      );
    });
  });

  /**
   * Sub-suite for testing identification of desktop operating systems.
   */
  describe("Desktop Heuristics", () => {
    /**
     * Test case to verify that Windows OS is identified as a desktop device.
     */
    it("returns Desktop for Windows", () => {
      // Assert: Ensure the presence of `Windows` OS returns the `Desktop` label.
      expect(formatDevice(null, null, null, "Chrome", "Windows", "")).toBe("Desktop");
    });

    /**
     * Test case to verify that macOS is identified as a desktop device.
     */
    it("returns Desktop for macOS", () => {
      // Assert: Ensure the presence of `Mac OS` returns the `Desktop` label.
      expect(formatDevice(null, null, null, "Safari", "Mac OS", "")).toBe("Desktop");
    });

    /**
     * Test case to verify that Linux is identified as a desktop device.
     */
    it("returns Desktop for Linux", () => {
      // Assert: Ensure the presence of `Linux` OS returns the `Desktop` label.
      expect(formatDevice(null, null, null, "Firefox", "Linux", "")).toBe("Desktop");
    });
  });

  /**
   * Sub-suite for testing generic fallbacks when specific device data is missing.
   */
  describe("Broad Fallbacks", () => {
    /**
     * Test case to verify that mobile browsers trigger a `Mobile Device` label if the OS is unknown.
     */
    it("returns Mobile Device if browser name indicates mobile", () => {
      // Assert: Ensure the string `Mobile` in the browser name acts as a heuristic for mobile devices.
      expect(formatDevice(null, null, null, "Chrome Mobile", "Unknown OS", "")).toBe(
        "Mobile Device"
      );
    });

    /**
     * Test case to verify that tablet browsers trigger a `Tablet Device` label if the OS is unknown.
     */
    it("returns Tablet Device if browser name indicates tablet", () => {
      // Assert: Ensure the string `Tablet` in the browser name acts as a heuristic for tablet devices.
      expect(formatDevice(null, null, null, "Chrome Tablet", "Unknown OS", "")).toBe(
        "Tablet Device"
      );
    });

    /**
     * Test case to verify the final fallback to `Desktop` when no other heuristics match.
     */
    it("defaults to Desktop for completely unknown inputs", () => {
      // Assert: Verify that any unidentifiable environment is treated as a standard `Desktop`.
      expect(formatDevice(null, null, null, "Unknown Browser", "Unknown OS", "")).toBe("Desktop");
    });
  });
});

/**
 * Test suite for the `isSessionActive` utility function.
 */
describe("isSessionActive", () => {
  // Set up a controlled system time before each test to evaluate time-based logic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
  });

  // Revert to the actual system clock after each test.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that a session is considered active if the timestamp is very recent.
   */
  it("returns true if last active time was 1 minute ago", () => {
    // Arrange: Define a timestamp exactly 1 minute before the current mocked time.
    const lastActive = new Date(2025, 0, 1, 11, 59, 0);

    // Assert: Verify the session is still within the active window.
    expect(isSessionActive(lastActive)).toBe(true);
  });

  /**
   * Test case to verify that a session is still active just before the 5-minute timeout.
   */
  it("returns true if last active time was exactly 4 minutes 59 seconds ago", () => {
    // Arrange: Define a timestamp 1 second before the 5-minute expiration mark.
    const lastActive = new Date(2025, 0, 1, 11, 55, 1);

    // Assert: Verify the session is still active.
    expect(isSessionActive(lastActive)).toBe(true);
  });

  /**
   * Test case to verify that a session becomes inactive exactly at the 5-minute mark.
   */
  it("returns false if last active time was 5 minutes ago", () => {
    // Arrange: Define a timestamp exactly 5 minutes before the current mocked time.
    const lastActive = new Date(2025, 0, 1, 11, 55, 0);

    // Assert: Verify the session is no longer considered active.
    expect(isSessionActive(lastActive)).toBe(false);
  });

  /**
   * Test case to verify that a session is inactive if the timestamp is well beyond the threshold.
   */
  it("returns false if last active time was 10 minutes ago", () => {
    // Arrange: Define a timestamp 10 minutes before the current mocked time.
    const lastActive = new Date(2025, 0, 1, 11, 50, 0);

    // Assert: Verify the session is correctly identified as inactive.
    expect(isSessionActive(lastActive)).toBe(false);
  });
});
