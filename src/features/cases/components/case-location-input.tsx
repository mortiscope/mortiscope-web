import { memo } from "react";
import { type UseFormReturn } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sectionTitle,
  selectItemStyles,
  selectTriggerStyles,
  uniformInputStyles,
} from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

type AddressPart = { code: string; name: string };

type CaseLocationInputProps = {
  form: UseFormReturn<CaseDetailsFormInput>;
  regionList: AddressPart[];
  provinceList: AddressPart[];
  cityList: AddressPart[];
  barangayList: AddressPart[];
};

/**
 * Renders a group of dependent dropdowns for selecting a Philippine address.
 */
export const CaseLocationInput = memo(
  ({ form, regionList, provinceList, cityList, barangayList }: CaseLocationInputProps) => {
    const { control, watch, setValue } = form;
    const watchedRegion = watch("location.region");
    const watchedProvince = watch("location.province");
    const watchedCity = watch("location.city");

    return (
      <FormItem>
        <FormLabel className={sectionTitle}>Location</FormLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Region selection dropdown. */}
          <FormField
            control={control}
            name="location.region"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Region</FormLabel>
                <Select
                  value={field.value?.code || ""}
                  onValueChange={(code) => {
                    const region = regionList.find((r) => r.code === code) || null;
                    field.onChange(region);
                    setValue("location.province", null);
                    setValue("location.city", null);
                    setValue("location.barangay", null);
                  }}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        uniformInputStyles,
                        selectTriggerStyles,
                        "w-full cursor-pointer truncate"
                      )}
                    >
                      <SelectValue placeholder="Select Region" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72 overflow-x-auto">
                    {regionList.map((r) => (
                      <SelectItem key={r.code} value={r.code} className={selectItemStyles}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Province selection dropdown. */}
          <FormField
            control={control}
            name="location.province"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Province</FormLabel>
                <Select
                  value={field.value?.code || ""}
                  onValueChange={(code) => {
                    const province = provinceList.find((p) => p.code === code) || null;
                    field.onChange(province);
                    setValue("location.city", null);
                    setValue("location.barangay", null);
                  }}
                  disabled={!watchedRegion?.code || provinceList.length === 0}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        uniformInputStyles,
                        selectTriggerStyles,
                        "w-full cursor-pointer truncate"
                      )}
                    >
                      <SelectValue placeholder="Select Province" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72 overflow-x-auto">
                    {provinceList.map((p) => (
                      <SelectItem key={p.code} value={p.code} className={selectItemStyles}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City/Municipality selection dropdown. */}
          <FormField
            control={control}
            name="location.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">City/Municipality</FormLabel>
                <Select
                  value={field.value?.code || ""}
                  onValueChange={(code) => {
                    const city = cityList.find((c) => c.code === code) || null;
                    field.onChange(city);
                    setValue("location.barangay", null);
                  }}
                  disabled={!watchedProvince?.code || cityList.length === 0}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        uniformInputStyles,
                        selectTriggerStyles,
                        "w-full cursor-pointer truncate"
                      )}
                    >
                      <SelectValue placeholder="Select City/Municipality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72 overflow-x-auto">
                    {cityList.map((c) => (
                      <SelectItem key={c.code} value={c.code} className={selectItemStyles}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Barangay selection dropdown. */}
          <FormField
            control={control}
            name="location.barangay"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Barangay</FormLabel>
                <Select
                  value={field.value?.code || ""}
                  onValueChange={(code) => {
                    const barangay = barangayList.find((b) => b.code === code) || null;
                    field.onChange(barangay);
                  }}
                  disabled={!watchedCity?.code || barangayList.length === 0}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        uniformInputStyles,
                        selectTriggerStyles,
                        "w-full cursor-pointer truncate"
                      )}
                    >
                      <SelectValue placeholder="Select Barangay" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72 overflow-x-auto">
                    {barangayList.map((b) => (
                      <SelectItem key={b.code} value={b.code} className={selectItemStyles}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormItem>
    );
  }
);

CaseLocationInput.displayName = "CaseLocationInput";
