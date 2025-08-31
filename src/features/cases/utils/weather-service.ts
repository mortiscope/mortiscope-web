/**
 * Represents the coordinates of a location.
 */
export type Coordinates = {
  lat: number;
  long: number;
};

/**
 * Represents the temperature data returned by the service.
 */
export type TemperatureData = {
  value: number;
  unit: "C";
};

/**
 * Fetches the coordinates (latitude and longitude) for a given city name.
 * Uses the Open-Meteo Geocoding API.
 *
 * @param city - The name of the city to search for.
 * @returns A promise that resolves to the coordinates of the city.
 * @throws Error if the city is not found or the API request fails.
 */
export const getCoordinates = async (city: string): Promise<Coordinates> => {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch coordinates");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }

  const result = data.results[0];
  return {
    lat: result.latitude,
    long: result.longitude,
  };
};

/**
 * Fetches the historical temperature for a specific location and date.
 * Uses the Open-Meteo Historical Weather API.
 * Implements "Nearest Hour" logic to find the temperature closest to the provided time.
 *
 * @param lat - The latitude of the location.
 * @param long - The longitude of the location.
 * @param date - The date and time for which to fetch the temperature.
 * @returns A promise that resolves to the temperature data (value and unit).
 * @throws Error if the API request fails or no data is available.
 */
export const getHistoricalTemperature = async (
  lat: number,
  long: number,
  date: Date
): Promise<TemperatureData> => {
  // Format date as YYYY-MM-DD for the API
  const dateString = date.toISOString().split("T")[0];

  const response = await fetch(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${long}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data = await response.json();

  if (!data.hourly || !data.hourly.temperature_2m || !data.hourly.time) {
    throw new Error("No temperature data available");
  }

  // Find the index of the nearest hour
  const targetTime = date.getTime();
  const times = data.hourly.time.map((t: string) => new Date(t + "Z").getTime());

  // Find the index with the minimum difference between target time and data time
  let nearestIndex = 0;
  let minDiff = Math.abs(times[0] - targetTime);

  for (let i = 1; i < times.length; i++) {
    const diff = Math.abs(times[i] - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = i;
    }
  }

  const temperature = data.hourly.temperature_2m[nearestIndex];

  return {
    value: temperature,
    unit: "C",
  };
};
