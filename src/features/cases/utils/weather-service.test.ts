import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCoordinates, getHistoricalTemperature } from "@/features/cases/utils/weather-service";

/**
 * Test suite for the `weather-service` utilities.
 */
describe("weather-service", () => {
  // Arrange: Store the original global fetch implementation.
  const originalFetch = global.fetch;

  // Arrange: Set up a mock implementation for global fetch before each test.
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // Arrange: Restore the original fetch implementation and clear mocks after each test.
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  /**
   * Test suite for the `getCoordinates` function, which converts a city name to geographical coordinates.
   */
  describe("getCoordinates", () => {
    /**
     * Test case to verify that the function returns the correct latitude and longitude when a city is successfully found by the API.
     */
    it("returns coordinates when city is found", async () => {
      // Arrange: Define a mock API response containing search results with coordinates.
      const mockResponse = {
        results: [
          {
            latitude: 14.5995,
            longitude: 120.9842,
          },
        ],
      };

      // Arrange: Mock the `global.fetch` call to return a successful response with the mock data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Call the `getCoordinates` function with a known city name.
      const result = await getCoordinates("Manila");

      // Assert: Verify that the result matches the expected coordinates.
      expect(result).toEqual({ lat: 14.5995, long: 120.9842 });
      // Assert: Verify that `fetch` was called with the correct Open-Meteo geocoding API endpoint.
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("geocoding-api.open-meteo.com/v1/search?name=Manila")
      );
    });

    /**
     * Test case to ensure an error is thrown when the API returns no results for a given city name.
     */
    it("throws an error when city is not found", async () => {
      // Arrange: Define a mock response with an empty results array.
      const mockResponse = { results: [] };

      // Arrange: Mock `global.fetch` to return the empty response.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Assert: Verify that calling the function rejects with a "City not found" error.
      await expect(getCoordinates("UnknownCity")).rejects.toThrow("City not found");
    });

    /**
     * Test case to ensure an error is thrown when the API call fails.
     */
    it("throws an error when API request fails", async () => {
      // Arrange: Mock `global.fetch` to return a non-`ok` response.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
      } as Response);

      // Assert: Verify that calling the function rejects with a fetch failure error.
      await expect(getCoordinates("ErrorCity")).rejects.toThrow("Failed to fetch coordinates");
    });
  });

  /**
   * Test suite for the `getHistoricalTemperature` function, which retrieves past weather data.
   */
  describe("getHistoricalTemperature", () => {
    // Define constants for latitude, longitude, and a target date for testing.
    const MOCK_LAT = 14.5;
    const MOCK_LONG = 121.0;
    const TARGET_DATE = new Date("2025-05-15T14:30:00Z");

    // Define a mock historical weather API response with hourly temperature data.
    const mockWeatherResponse = {
      hourly: {
        time: ["2025-05-15T13:00", "2025-05-15T14:00", "2025-05-15T15:00"],
        temperature_2m: [30.0, 32.5, 31.0],
      },
    };

    /**
     * Test case to ensure the function returns the temperature corresponding to the nearest available hourly timestamp.
     */
    it("returns the temperature for the nearest hour", async () => {
      // Arrange: Mock `global.fetch` to return the historical weather data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      // Act: Call the function. The target date 14:30 should snap to 14:00, which has a temperature of 32.5.
      const result = await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, TARGET_DATE);

      // Assert: Verify the returned temperature is for 14:00.
      expect(result).toEqual({ value: 32.5, unit: "C" });
      // Assert: Verify that `fetch` was called with the correct historical API endpoint.
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("archive-api.open-meteo.com/v1/archive")
      );
    });

    /**
     * Test case to ensure timestamps falling exactly on the hour are correctly matched.
     */
    it("handles dates exactly on the hour correctly", async () => {
      // Arrange: Mock `global.fetch` to return the historical weather data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      // Arrange: Define a target date exactly on the hour (13:00).
      const exactDate = new Date("2025-05-15T13:00:00Z");
      // Act: Call the function. The date 13:00 should match the first entry, temperature 30.0.
      const result = await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, exactDate);

      // Assert: Verify the returned temperature is for 13:00.
      expect(result).toEqual({ value: 30.0, unit: "C" });
    });

    /**
     * Test case to ensure an error is thrown when the API request for historical data fails.
     */
    it("throws an error when API request fails", async () => {
      // Arrange: Mock `global.fetch` to return a non-`ok` response.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      // Assert: Verify that calling the function rejects with a fetch failure error.
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, TARGET_DATE)).rejects.toThrow(
        "Failed to fetch weather data"
      );
    });

    /**
     * Test case to ensure an error is thrown if the API response is successful but the expected data fields are missing.
     */
    it("throws an error when data is incomplete or missing", async () => {
      // Arrange: Mock `global.fetch` to return a successful response with missing hourly data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ hourly: {} }),
      } as Response);

      // Assert: Verify that calling the function rejects with a data availability error.
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, TARGET_DATE)).rejects.toThrow(
        "No temperature data available"
      );
    });
  });
});
