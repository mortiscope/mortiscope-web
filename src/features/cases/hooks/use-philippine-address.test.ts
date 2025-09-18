import * as spa from "select-philippines-address";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";

// Mock the external library for Philippine address data fetching.
vi.mock("select-philippines-address", () => ({
  regions: vi.fn(),
  provinces: vi.fn(),
  cities: vi.fn(),
  barangays: vi.fn(),
}));

/**
 * Test suite for the `usePhilippineAddress` hook.
 */
describe("usePhilippineAddress", () => {
  // Setup runs before each test.
  beforeEach(() => {
    // Arrange: Clear execution history of all spies and mocks.
    vi.clearAllMocks();

    // Arrange: Mock the API calls to return predictable single-entry lists.
    vi.mocked(spa.regions).mockResolvedValue([{ region_code: "R1", region_name: "Region 1" }]);
    vi.mocked(spa.provinces).mockResolvedValue([
      { province_code: "P1", province_name: "Province 1" },
    ]);
    vi.mocked(spa.cities).mockResolvedValue([{ city_code: "C1", city_name: "City 1" }]);
    vi.mocked(spa.barangays).mockResolvedValue([{ brgy_code: "B1", brgy_name: "Barangay 1" }]);
  });

  /**
   * Test case to verify that the region list is fetched automatically upon hook mount.
   */
  it("fetches region list on mount", async () => {
    // Act: Render the hook with no initial arguments.
    const { result } = renderHook(() => usePhilippineAddress({}));

    // Assert: Check the initial loading state.
    expect(result.current.isLoading).toBe(true);

    // Assert: Wait for the query to complete and loading state to turn false.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Check that the returned list matches the mock data after mapping to the `code`/`name` format.
    expect(result.current.regionList).toEqual([{ code: "R1", name: "Region 1" }]);
    // Assert: Check that the `spa.regions` API function was called.
    expect(spa.regions).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the province list is fetched when a `regionCode` is provided to the hook.
   */
  it("fetches province list when regionCode changes", async () => {
    // Arrange: Render the hook, initially with an empty region code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "" },
    });

    // Assert: Check that the province list is initially empty.
    expect(result.current.provinceList).toEqual([]);

    // Act: Rerender the hook with a specific region code, triggering the fetch effect.
    rerender({ regionCode: "R1" });

    // Assert: Wait for the province list to contain data.
    await waitFor(() => {
      expect(result.current.provinceList).toHaveLength(1);
    });

    // Assert: Check the contents of the fetched province list.
    expect(result.current.provinceList).toEqual([{ code: "P1", name: "Province 1" }]);
    // Assert: Check that the API was called with the provided region code.
    expect(spa.provinces).toHaveBeenCalledWith("R1");
  });

  /**
   * Test case to verify that the province list is cleared when the `regionCode` input is removed.
   */
  it("clears province list when regionCode is removed", async () => {
    // Arrange: Render the hook, initially with a valid region code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1" },
    });

    // Arrange: Wait for the province list to be populated.
    await waitFor(() => {
      expect(result.current.provinceList).toHaveLength(1);
    });

    // Act: Rerender the hook with an empty region code.
    rerender({ regionCode: "" });

    // Assert: Check that the province list is now empty.
    expect(result.current.provinceList).toEqual([]);
  });

  /**
   * Test case to verify that the city list is fetched when a `provinceCode` is provided.
   */
  it("fetches city list when provinceCode changes", async () => {
    // Arrange: Render the hook, initially with region but no province code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1", provinceCode: "" },
    });

    // Assert: Check that the city list is initially empty.
    expect(result.current.cityList).toEqual([]);

    // Act: Rerender the hook with a specific province code.
    rerender({ regionCode: "R1", provinceCode: "P1" });

    // Assert: Wait for the city list to contain data.
    await waitFor(() => {
      expect(result.current.cityList).toHaveLength(1);
    });

    // Assert: Check the contents of the fetched city list.
    expect(result.current.cityList).toEqual([{ code: "C1", name: "City 1" }]);
    // Assert: Check that the API was called with the provided province code.
    expect(spa.cities).toHaveBeenCalledWith("P1");
  });

  /**
   * Test case to verify that the barangay list is fetched when a `cityCode` is provided.
   */
  it("fetches barangay list when cityCode changes", async () => {
    // Arrange: Render the hook, initially with codes up to province but no city code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1", provinceCode: "P1", cityCode: "" },
    });

    // Assert: Check that the barangay list is initially empty.
    expect(result.current.barangayList).toEqual([]);

    // Act: Rerender the hook with a specific city code.
    rerender({ regionCode: "R1", provinceCode: "P1", cityCode: "C1" });

    // Assert: Wait for the barangay list to contain data.
    await waitFor(() => {
      expect(result.current.barangayList).toHaveLength(1);
    });

    // Assert: Check the contents of the fetched barangay list.
    expect(result.current.barangayList).toEqual([{ code: "B1", name: "Barangay 1" }]);
    // Assert: Check that the API was called with the provided city code.
    expect(spa.barangays).toHaveBeenCalledWith("C1");
  });

  /**
   * Test case to verify that duplicate entries returned by the API are filtered out.
   */
  it("filters duplicate provinces correctly", async () => {
    // Arrange: Mock the API to return duplicate province entries.
    vi.mocked(spa.provinces).mockResolvedValue([
      { province_code: "P1", province_name: "Province 1" },
      { province_code: "P1", province_name: "Province 1" },
      { province_code: "P2", province_name: "Province 2" },
    ]);

    // Act: Render the hook with a region code to trigger the fetch.
    const { result } = renderHook(() => usePhilippineAddress({ regionCode: "R1" }));

    // Assert: Wait for the province list to contain data, checking that the length is correct after deduplication.
    await waitFor(() => {
      expect(result.current.provinceList).toHaveLength(2);
    });

    // Assert: Check the contents of the deduplicated list.
    expect(result.current.provinceList).toEqual([
      { code: "P1", name: "Province 1" },
      { code: "P2", name: "Province 2" },
    ]);
  });

  /**
   * Test case to ensure the hook gracefully handles a null response from an API call for provinces.
   */
  it("handles empty API responses safely", async () => {
    // Arrange: Mock the API to return null.
    vi.mocked(spa.provinces).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof spa.provinces>>
    );

    // Act: Render the hook.
    const { result } = renderHook(() => usePhilippineAddress({ regionCode: "R1" }));

    // Assert: Wait for the result and check that the list is an empty array.
    await waitFor(() => {
      expect(result.current.provinceList).toEqual([]);
    });
  });

  /**
   * Test case to ensure the hook gracefully handles a null response from the region API call.
   */
  it("handles invalid region API response safely", async () => {
    // Arrange: Mock the API to return null for regions.
    vi.mocked(spa.regions).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof spa.regions>>
    );

    // Act: Render the hook.
    const { result } = renderHook(() => usePhilippineAddress({}));

    // Assert: Wait for the loading state to finish.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Check that the region list is an empty array.
    expect(result.current.regionList).toEqual([]);
  });

  /**
   * Test case to ensure the hook gracefully handles a null response from the city API call.
   */
  it("handles invalid city API response safely", async () => {
    // Arrange: Mock the API to return null for cities.
    vi.mocked(spa.cities).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof spa.cities>>
    );

    // Act: Render the hook with codes up to province to trigger the city fetch.
    const { result } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1", provinceCode: "P1" },
    });

    // Assert: Wait for the result and check that the city list is an empty array.
    await waitFor(() => {
      expect(result.current.cityList).toEqual([]);
    });
  });

  /**
   * Test case to ensure the hook gracefully handles a null response from the barangay API call.
   */
  it("handles invalid barangay API response safely", async () => {
    // Arrange: Mock the API to return null for barangays.
    vi.mocked(spa.barangays).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof spa.barangays>>
    );

    // Act: Render the hook with codes up to city to trigger the barangay fetch.
    const { result } = renderHook(() =>
      usePhilippineAddress({ regionCode: "R1", provinceCode: "P1", cityCode: "C1" })
    );

    // Assert: Wait for the result and check that the barangay list is an empty array.
    await waitFor(() => {
      expect(result.current.barangayList).toEqual([]);
    });
  });

  /**
   * Test case to verify that the city list is cleared when the `provinceCode` input is removed.
   */
  it("clears city list when provinceCode is removed", async () => {
    // Arrange: Render the hook, initially with a valid province code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1", provinceCode: "P1" },
    });

    // Arrange: Wait for the city list to be populated.
    await waitFor(() => {
      expect(result.current.cityList).toHaveLength(1);
    });

    // Act: Rerender the hook with an empty province code.
    rerender({ regionCode: "R1", provinceCode: "" });

    // Assert: Check that the city list is now empty.
    expect(result.current.cityList).toEqual([]);
  });

  /**
   * Test case to verify that the barangay list is cleared when the `cityCode` input is removed.
   */
  it("clears barangay list when cityCode is removed", async () => {
    // Arrange: Render the hook, initially with a valid city code.
    const { result, rerender } = renderHook((props) => usePhilippineAddress(props), {
      initialProps: { regionCode: "R1", provinceCode: "P1", cityCode: "C1" },
    });

    // Arrange: Wait for the barangay list to be populated.
    await waitFor(() => {
      expect(result.current.barangayList).toHaveLength(1);
    });

    // Act: Rerender the hook with an empty city code.
    rerender({ regionCode: "R1", provinceCode: "P1", cityCode: "" });

    // Assert: Check that the barangay list is now empty.
    expect(result.current.barangayList).toEqual([]);
  });
});
