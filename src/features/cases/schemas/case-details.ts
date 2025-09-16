import { z } from "zod";

/**
 * A reusable schema for a location part.
 */
const locationValueSchema = z.object({
  code: z.string().min(1, "Code cannot be empty."),
  name: z.string().min(1, "Name cannot be empty."),
});

/**
 * Schema for the raw form input where some location fields can be null
 */
const rawCaseDetailsSchema = z.object({
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
          message: "Temperature is required.",
        })
      ),
      unit: z.enum(["C", "F"]),
    })
    // Validates the temperature value against realistic ranges based on the selected unit.
    .refine(
      (data) => {
        const ranges = {
          C: { min: -50, max: 60 },
          F: { min: -58, max: 140 },
        } as const;
        const { min, max } = ranges[data.unit];

        return data.value >= min && data.value <= max;
      },
      {
        message: "Temperature must be within valid range.",
        path: ["value"],
      }
    ),

  // Validates the hierarchical location data.
  location: z.object({
    region: locationValueSchema,
    province: z.nullable(locationValueSchema),
    city: z.nullable(locationValueSchema),
    barangay: z.nullable(locationValueSchema),
  }),

  caseDate: z.date({
    message: "A valid case date is required.",
  }),

  // Validates the notes field, allowing it to be an optional string.
  notes: z.string().optional(),
});

/**
 * The main schema that transforms nullable location fields to required ones
 */
export const caseDetailsSchema = rawCaseDetailsSchema.transform((data, ctx) => {
  // Check if province is null
  if (!data.location.province) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Province is required.",
      path: ["location", "province"],
    });
    return z.NEVER;
  }

  // Check if city is null
  if (!data.location.city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "City/Municipality is required.",
      path: ["location", "city"],
    });
    return z.NEVER;
  }

  // Check if barangay is null
  if (!data.location.barangay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Barangay is required.",
      path: ["location", "barangay"],
    });
    return z.NEVER;
  }

  // Return the data with proper typing
  return {
    caseName: data.caseName,
    temperature: data.temperature,
    location: {
      region: data.location.region,
      province: data.location.province,
      city: data.location.city,
      barangay: data.location.barangay,
    },
    caseDate: data.caseDate,
    notes: data.notes,
  };
});

export type CaseDetailsFormInput = z.input<typeof rawCaseDetailsSchema>;
export type CaseDetailsFormData = z.output<typeof caseDetailsSchema>;
