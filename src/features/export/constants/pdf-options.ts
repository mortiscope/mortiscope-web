import { FiFileText, FiLock, FiShield } from "react-icons/fi";

/**
 * Defines the possible steps in the multi-step PDF export wizard.
 */
export type PdfExportStep = "introduction" | "security" | "permissions";

/**
 * Defines the available security levels for the PDF. The `null` type
 * represents an unselected or initial state.
 */
export type SecurityLevel = "standard" | "view_protected" | "permissions_protected" | null;

/**
 * Defines the available page sizes for the PDF. The `null` type
 * represents an unselected or initial state.
 */
export type PageSize = "a4" | "letter" | null;

/**
 * Defines the structure for PDF user access permissions. Each property
 * corresponds to a specific action that can be allowed or disallowed.
 */
export interface PdfPermissions {
  printing: boolean;
  copying: boolean;
  annotations: boolean;
  formFilling: boolean;
  assembly: boolean;
  extraction: boolean;
  pageRotation: boolean;
  degradedPrinting: boolean;
  screenReader: boolean;
  metadataModification: boolean;
}

/**
 * A configuration array that defines the security options for the interface.
 * This is used to dynamically generate selection controls, mapping each
 * security level to its corresponding label, description, and icon.
 */
export const securityOptions: {
  value: NonNullable<SecurityLevel>;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "standard",
    label: "Standard",
    description: "A standard PDF anyone can open, edit, or print.",
    icon: FiFileText,
  },
  {
    value: "view_protected",
    label: "View-Protected",
    description: "Requires a password to open and view.",
    icon: FiLock,
  },
  {
    value: "permissions_protected",
    label: "Permissions-Protected",
    description: "Protects against editing, printing, or copying.",
    icon: FiShield,
  },
];

/**
 * Provides the default state for PDF permissions, where all restrictive actions
 * are initially disabled. This is used to initialize the permissions form.
 */
export const defaultPdfPermissions: PdfPermissions = {
  printing: false,
  copying: false,
  annotations: false,
  formFilling: false,
  assembly: false,
  extraction: false,
  pageRotation: false,
  degradedPrinting: false,
  screenReader: false,
  metadataModification: false,
};
