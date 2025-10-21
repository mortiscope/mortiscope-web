import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCoordinates, getHistoricalTemperature } from "@/features/cases/utils/weather-service";

/**
 * Integration test suite for the weather service utility functions.
 */
describe("weather-service (integration)", () => {
  // Store the original fetch implementation to restore it after tests.
  const originalFetch = global.fetch;

  /**
   * Replaces the global fetch with a mock function before each test case.
   */
  beforeEach(() => {
    // Arrange: Assign a mock function to the global fetch object.
    global.fetch = vi.fn();
  });

  /**
   * Restores the global fetch and clears all mock state after each test case.
   */
  afterEach(() => {
    // Arrange: Restore the original fetch implementation.
    global.fetch = originalFetch;
    // Arrange: Clear all mock call history and implementations.
    vi.clearAllMocks();
  });

  /**
   * Test suite for the getCoordinates function.
   */
  describe("getCoordinates", () => {
    /**
     * Test case to verify that valid coordinates are returned for a known city.
     */
    it("returns coordinates when city is found", async () => {
      // Arrange: Define a mock response containing geographic data for Manila.
      const mockResponse = {
        results: [
          {
            latitude: 14.5995,
            longitude: 120.9842,
            name: "Manila",
            country: "Philippines",
          },
        ],
      };

      // Arrange: Configure the fetch mock to return the successful city data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Invoke the getCoordinates function with a valid city name.
      const result = await getCoordinates("Manila");

      // Assert: Verify the returned coordinates match the expected values.
      expect(result).toEqual({ lat: 14.5995, long: 120.9842 });
      // Assert: Ensure the API was called with the correctly formatted URL.
      expect(global.fetch).toHaveBeenCalledWith(
        "https://geocoding-api.open-meteo.com/v1/search?name=Manila&count=1&format=json"
      );
    });

    /**
     * Test case to verify that city names with special characters are URI encoded.
     */
    it("correctly encodes city names with special characters", async () => {
      // Arrange: Define a mock response for a city with special characters.
      const mockResponse = {
        results: [
          {
            latitude: 48.8566,
            longitude: 2.3522,
          },
        ],
      };

      // Arrange: Configure the fetch mock to return successful data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Invoke the getCoordinates function with a name containing a tilde and space.
      await getCoordinates("São Paulo");

      // Assert: Verify that the fetch URL contains the properly encoded city name.
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("name=S%C3%A3o%20Paulo"));
    });

    /**
     * Test case to verify that an error is thrown when the API returns no results.
     */
    it("throws an error when city is not found", async () => {
      // Arrange: Configure the fetch mock to return an empty results array.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      // Act & Assert: Verify that the function throws the expected error for missing cities.
      await expect(getCoordinates("NonExistentCity123")).rejects.toThrow("City not found");
    });

    /**
     * Test case to verify that an error is thrown when the results field is missing from the response.
     */
    it("throws an error when results field is missing", async () => {
      // Arrange: Configure the fetch mock to return an empty object.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      // Act & Assert: Verify that a missing results field triggers a city not found error.
      await expect(getCoordinates("TestCity")).rejects.toThrow("City not found");
    });

    /**
     * Test case to verify that network or server failures result in a rejected promise.
     */
    it("throws an error when API request fails", async () => {
      // Arrange: Configure the fetch mock to simulate a 500 Internal Server Error.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      // Act & Assert: Verify that a non-ok response triggers a fetch failure error.
      await expect(getCoordinates("Manila")).rejects.toThrow("Failed to fetch coordinates");
    });
  });

  /**
   * Test suite for the getHistoricalTemperature function.
   */
  describe("getHistoricalTemperature", () => {
    // Define constant coordinates for the test cases.
    const MOCK_LAT = 14.5995;
    const MOCK_LONG = 120.9842;

    /**
     * Test case to verify that the temperature from the hour closest to the target date is selected.
     */
    it("returns the temperature for the nearest hour", async () => {
      // Arrange: Define a mock response with hourly temperature data.
      const mockResponse = {
        hourly: {
          time: ["2025-06-15T12:00", "2025-06-15T13:00", "2025-06-15T14:00", "2025-06-15T15:00"],
          temperature_2m: [28.5, 30.2, 32.1, 31.5],
        },
      };

      // Arrange: Configure the fetch mock to return the hourly weather data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Request the temperature for a time closest to 14:00.
      const targetDate = new Date("2025-06-15T14:25:00Z");
      const result = await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate);

      // Assert: Verify the returned temperature corresponds to the 14:00 timestamp.
      expect(result).toEqual({ value: 32.1, unit: "C" });
    });

    /**
     * Test case to verify correct temperature selection when the target is exactly on an hour.
     */
    it("handles dates exactly on the hour", async () => {
      // Arrange: Define a mock response with exact hourly increments.
      const mockResponse = {
        hourly: {
          time: ["2025-06-15T10:00", "2025-06-15T11:00", "2025-06-15T12:00"],
          temperature_2m: [25.0, 26.5, 28.0],
        },
      };

      // Arrange: Configure the fetch mock to return the success response.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Request the temperature for exactly 11:00.
      const exactDate = new Date("2025-06-15T11:00:00Z");
      const result = await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, exactDate);

      // Assert: Verify the returned value matches the 11:00 data point.
      expect(result).toEqual({ value: 26.5, unit: "C" });
    });

    /**
     * Test case to verify rounding logic when the target time is at the midpoint between two hours.
     */
    it("selects earlier hour when target is exactly between two hours", async () => {
      // Arrange: Define a mock response with data for two consecutive hours.
      const mockResponse = {
        hourly: {
          time: ["2025-06-15T14:00", "2025-06-15T15:00"],
          temperature_2m: [30.0, 32.0],
        },
      };

      // Arrange: Configure the fetch mock to return the hourly data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Request the temperature for 14:30.
      const midpointDate = new Date("2025-06-15T14:30:00Z");
      const result = await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, midpointDate);

      // Assert: Verify the function rounds down to the earlier hour (14:00).
      expect(result.value).toBe(30.0);
    });

    /**
     * Test case to verify that the historical API URL is constructed with the correct parameters.
     */
    it("constructs correct API URL with formatted date", async () => {
      // Arrange: Define a minimal mock response for the API call.
      const mockResponse = {
        hourly: {
          time: ["2025-06-15T12:00"],
          temperature_2m: [28.0],
        },
      };

      // Arrange: Configure the fetch mock to return the successful data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Invoke the temperature retrieval with a specific date.
      const targetDate = new Date("2025-06-15T12:30:00Z");
      await getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate);

      // Assert: Verify the fetch call uses the archive endpoint with correctly formatted date strings.
      expect(global.fetch).toHaveBeenCalledWith(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${MOCK_LAT}&longitude=${MOCK_LONG}&start_date=2025-06-15&end_date=2025-06-15&hourly=temperature_2m`
      );
    });

    /**
     * Test case to verify error handling for 5xx status codes from the weather API.
     */
    it("throws an error when API request fails", async () => {
      // Arrange: Configure the fetch mock to simulate a 503 Service Unavailable error.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      // Act & Assert: Verify that a service error triggers the appropriate weather data fetch exception.
      const targetDate = new Date("2025-06-15T12:00:00Z");
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate)).rejects.toThrow(
        "Failed to fetch weather data"
      );
    });

    /**
     * Test case to verify that an error is thrown when the hourly container is missing in the response.
     */
    it("throws an error when hourly data is missing", async () => {
      // Arrange: Configure the fetch mock to return an empty object instead of weather data.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      // Act & Assert: Verify that missing hourly data triggers the expected availability error.
      const targetDate = new Date("2025-06-15T12:00:00Z");
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate)).rejects.toThrow(
        "No temperature data available"
      );
    });

    /**
     * Test case to verify that an error is thrown when the temperature array is missing from the hourly data.
     */
    it("throws an error when temperature array is missing", async () => {
      // Arrange: Configure the fetch mock to return a response without the temperature_2m field.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: ["2025-06-15T12:00"],
          },
        }),
      } as Response);

      // Act & Assert: Verify that the absence of temperature values triggers an error.
      const targetDate = new Date("2025-06-15T12:00:00Z");
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate)).rejects.toThrow(
        "No temperature data available"
      );
    });

    /**
     * Test case to verify that an error is thrown when the time array is missing from the hourly data.
     */
    it("throws an error when time array is missing", async () => {
      // Arrange: Configure the fetch mock to return a response without the time field.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            temperature_2m: [28.0],
          },
        }),
      } as Response);

      // Act & Assert: Verify that the absence of timestamps triggers an error.
      const targetDate = new Date("2025-06-15T12:00:00Z");
      await expect(getHistoricalTemperature(MOCK_LAT, MOCK_LONG, targetDate)).rejects.toThrow(
        "No temperature data available"
      );
    });
  });
});
