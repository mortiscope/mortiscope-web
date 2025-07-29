import { memo } from "react";
import { type Control } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

type CaseNameInputProps = {
  control: Control<CaseDetailsFormInput>;
};

/**
 * Renders the input field for the case name.
 */
export const CaseNameInput = memo(({ control }: CaseNameInputProps) => {
  return (
    <FormField
      control={control}
      name="caseName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={sectionTitle}>Case Name</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter case name"
              {...field}
              value={field.value ?? ""}
              className={cn(uniformInputStyles)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

CaseNameInput.displayName = "CaseNameInput";
