import { z } from "zod";

/**
 * A reusable schema for a location part.
 */
const locationValueSchema = z.object({
  code: z.string().min(1, "Code cannot be empty."),
  name: z.string().min(1, "Name cannot be empty."),
});

/**
 * The main schema for validating all fields in the case details form.
 */
export const detailsSchema = z.object({
  // Validates the case name for required length.
  caseName: z
    .string()
    .min(8, { message: "Case name must be at least 8 characters." })
    .max(256, { message: "Case name cannot exceed 256 characters." }),

  // Validates the temperature input, including its value and unit.
  temperature: z
    .object({
      value: z.preprocess(
        // Preprocesses the input to handle empty strings for better error handling.
        (val) => (val === "" ? undefined : val),
        // Coerces the value to a number.
        z.coerce.number({
          required_error: "Temperature is required.",
          invalid_type_error: "Enter a valid number for temperature.",
        })
      ),
      unit: z.enum(["C", "F"]),
    })
    // Validates the temperature value against realistic ranges based on the selected unit.
    .refine(
      (data) => {
        // Skips validation if the value is not a valid number to avoid redundant errors.
        if (typeof data.value !== "number" || isNaN(data.value)) {
          return true;
        }

        const ranges = {
          C: { min: -50, max: 60 },
          F: { min: -58, max: 140 },
        };
        const { min, max } = ranges[data.unit];

        return data.value >= min && data.value <= max;
      },
      // Provides a dynamic error message that includes the correct range.
      (data) => {
        const ranges = {
          C: { min: -50, max: 60 },
          F: { min: -58, max: 140 },
        };
        const { min, max } = ranges[data.unit];
        return {
          message: `Temperature must be between ${min}° and ${max}°.`,
          path: ["value"],
        };
      }
    ),

  // Validates the hierarchical location data.
  location: z.object({
    region: locationValueSchema,
    // Refines nullable fields to ensure a value is required for dependent dropdowns.
    province: z
      .nullable(locationValueSchema)
      .refine((val): val is NonNullable<typeof val> => val !== null, {
        message: "Province is required.",
      }),
    city: z
      .nullable(locationValueSchema)
      .refine((val): val is NonNullable<typeof val> => val !== null, {
        message: "City/Municipality is required.",
      }),
    barangay: z
      .nullable(locationValueSchema)
      .refine((val): val is NonNullable<typeof val> => val !== null, {
        message: "Barangay is required.",
      }),
  }),

  // Ensures a valid date is provided for the case.
  caseDate: z.date({
    required_error: "A case date is required.",
    invalid_type_error: "That's not a valid date.",
  }),
});

export type DetailsFormInput = z.input<typeof detailsSchema>;
export type DetailsFormData = z.infer<typeof detailsSchema>;
