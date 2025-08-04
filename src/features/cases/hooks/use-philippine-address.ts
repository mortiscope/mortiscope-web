import { useEffect, useState } from "react";
import { barangays, cities, provinces, regions } from "select-philippines-address";

// Type definitions for address data
export type Address = { code: string; name: string };
type Region = { region_code: string; region_name: string };
type Province = { province_code: string; province_name: string };
type City = { city_code: string; city_name: string };
type Barangay = { brgy_code: string; brgy_name: string };

type UsePhilippineAddressProps = {
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
};

/**
 * A hook to manage fetching and state for Philippine address dropdowns.
 * @param dependencies - The selected codes for region, province, and city to trigger fetches.
 * @returns Lists of regions, provinces, cities, and barangays, plus a loading state.
 */
export const usePhilippineAddress = ({
  regionCode,
  provinceCode,
  cityCode,
}: UsePhilippineAddressProps) => {
  const [regionList, setRegionList] = useState<Address[]>([]);
  const [provinceList, setProvinceList] = useState<Address[]>([]);
  const [cityList, setCityList] = useState<Address[]>([]);
  const [barangayList, setBarangayList] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetches the list of all regions on initial component mount.
  useEffect(() => {
    regions().then((data: Region[]) => {
      if (Array.isArray(data)) {
        const formatted = data.map((r) => ({ code: r.region_code, name: r.region_name }));
        setRegionList(formatted);
      }
      // Once the essential regions are fetched, the initial load is complete.
      setIsLoading(false);
    });
  }, []);

  // Fetches the list of provinces whenever the selected region changes.
  useEffect(() => {
    if (regionCode) {
      provinces(regionCode).then((data: Province[]) => {
        if (Array.isArray(data)) {
          const formatted = data.map((p) => ({ code: p.province_code, name: p.province_name }));
          const uniqueProvinces = Array.from(
            new Map(formatted.map((item) => [item.code, item])).values()
          );
          setProvinceList(uniqueProvinces);
        } else {
          setProvinceList([]);
        }
      });
    } else {
      setProvinceList([]);
    }
  }, [regionCode]);

  // Fetches the list of cities/municipalities whenever the selected province changes.
  useEffect(() => {
    if (provinceCode) {
      cities(provinceCode).then((data: City[]) => {
        if (Array.isArray(data)) {
          const formatted = data.map((c) => ({ code: c.city_code, name: c.city_name }));
          setCityList(formatted);
        } else {
          setCityList([]);
        }
      });
    } else {
      setCityList([]);
    }
  }, [provinceCode]);

  // Fetches the list of barangays whenever the selected city/municipality changes.
  useEffect(() => {
    if (cityCode) {
      barangays(cityCode).then((data: Barangay[]) => {
        if (Array.isArray(data)) {
          const formatted = data.map((b) => ({ code: b.brgy_code, name: b.brgy_name }));
          setBarangayList(formatted);
        } else {
          setBarangayList([]);
        }
      });
    } else {
      setBarangayList([]);
    }
  }, [cityCode]);

  // Return the new loading state along with the lists.
  return { regionList, provinceList, cityList, barangayList, isLoading };
};
