"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PdfPermissions } from "@/features/export/constants/pdf-options";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the PDF export permission component.
 */
interface PdfExportPermissionsStepProps {
  /** The current state of the PDF permissions. */
  permissions: PdfPermissions;
  /** A callback function to update the permissions state. */
  onPermissionsChange: (permissions: PdfPermissions) => void;
  /** A boolean to indicate if an action is pending, which disables the inputs. */
  isPending: boolean;
}

/**
 * Renders the interface for the "Permissions" step of the PDF export wizard. This component
 * allows the user to configure detailed restrictions for the PDF. It is a fully controlled component.
 */
export const PdfExportPermissionsStep = ({
  permissions,
  onPermissionsChange,
  isPending,
}: PdfExportPermissionsStepProps) => {
  return (
    // The main container is visually disabled when a pending action is in progress.
    <div className={cn("space-y-6", isPending && "pointer-events-none opacity-50")}>
      {/* Permissions Checkbox Section */}
      <div className="space-y-3">
        <Label className="font-inter text-sm font-normal text-slate-700">
          Configure document restrictions and access permissions.
        </Label>
        {/* Container for the list of permissions. */}
        <div className="space-y-3.25 rounded-2xl border-2 border-slate-200 p-4">
          {/* A permanently disabled checkbox indicating a required restriction. */}
          <div className="flex items-center space-x-2 opacity-60">
            <Checkbox
              id="editing"
              checked
              disabled
              className="cursor-not-allowed data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            />
            <Label
              htmlFor="editing"
              className="font-inter cursor-not-allowed text-sm font-normal text-slate-600"
            >
              Disallow Changing the Document (required)
            </Label>
          </div>

          {/* Interdependent Checkbox Groups */}

          {/* Printing Restrictions */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="printing"
              checked={permissions.printing}
              onCheckedChange={(checked) => {
                const newPermissions = { ...permissions, printing: !!checked };
                // If "Disallow Printing" is checked, automatically check "Disallow Degraded Printing".
                if (checked) {
                  newPermissions.degradedPrinting = true;
                }
                onPermissionsChange(newPermissions);
              }}
              className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            />
            <Label
              htmlFor="printing"
              className="font-inter cursor-pointer text-sm font-normal text-slate-800"
            >
              Disallow Printing
            </Label>
          </div>

          {/* Degraded Printing - Dependent on 'printing' */}
          <div className={cn("flex items-center space-x-3", permissions.printing && "opacity-60")}>
            <Checkbox
              id="degradedPrinting"
              checked={permissions.degradedPrinting}
              disabled={permissions.printing}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, degradedPrinting: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.printing ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="degradedPrinting"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.printing
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Degraded Printing {permissions.printing && "(required)"}
            </Label>
          </div>

          {/* Copying Restrictions */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="copying"
              checked={permissions.copying}
              onCheckedChange={(checked) => {
                const newPermissions = { ...permissions, copying: !!checked };
                // If "Disallow Copying" is checked, auto-check its dependents.
                if (checked) {
                  newPermissions.extraction = true;
                  newPermissions.screenReader = true;
                }
                onPermissionsChange(newPermissions);
              }}
              className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            />
            <Label
              htmlFor="copying"
              className="font-inter cursor-pointer text-sm font-normal text-slate-800"
            >
              Disallow Copying of Text and Images
            </Label>
          </div>

          {/* Content Extraction - Dependent on 'copying' */}
          <div className={cn("flex items-center space-x-3", permissions.copying && "opacity-60")}>
            <Checkbox
              id="extraction"
              checked={permissions.extraction}
              disabled={permissions.copying}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, extraction: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.copying ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="extraction"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.copying
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Content Extraction {permissions.copying && "(required)"}
            </Label>
          </div>

          {/* Screen Reader Access - Dependent on 'copying' */}
          <div className={cn("flex items-center space-x-3", permissions.copying && "opacity-60")}>
            <Checkbox
              id="screenReader"
              checked={permissions.screenReader}
              disabled={permissions.copying}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, screenReader: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.copying ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="screenReader"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.copying
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Screen Reader Access {permissions.copying && "(required)"}
            </Label>
          </div>

          {/* Annotation Restrictions */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="annotations"
              checked={permissions.annotations}
              onCheckedChange={(checked) => {
                const newPermissions = { ...permissions, annotations: !!checked };
                if (checked) newPermissions.formFilling = true;
                onPermissionsChange(newPermissions);
              }}
              className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            />
            <Label
              htmlFor="annotations"
              className="font-inter cursor-pointer text-sm font-normal text-slate-800"
            >
              Disallow Adding Comments or Annotations
            </Label>
          </div>

          {/* Form Filling - Dependent on 'annotations' */}
          <div
            className={cn("flex items-center space-x-3", permissions.annotations && "opacity-60")}
          >
            <Checkbox
              id="formFilling"
              checked={permissions.formFilling}
              disabled={permissions.annotations}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, formFilling: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.annotations ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="formFilling"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.annotations
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Filling Forms {permissions.annotations && "(required)"}
            </Label>
          </div>

          {/* Document Assembly Restrictions */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="assembly"
              checked={permissions.assembly}
              onCheckedChange={(checked) => {
                const newPermissions = { ...permissions, assembly: !!checked };
                if (checked) {
                  newPermissions.pageRotation = true;
                  newPermissions.metadataModification = true;
                }
                onPermissionsChange(newPermissions);
              }}
              className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            />
            <Label
              htmlFor="assembly"
              className="font-inter cursor-pointer text-sm font-normal text-slate-800"
            >
              Disallow Document Assembly
            </Label>
          </div>

          {/* Page Rotation - Dependent on 'assembly' */}
          <div className={cn("flex items-center space-x-3", permissions.assembly && "opacity-60")}>
            <Checkbox
              id="pageRotation"
              checked={permissions.pageRotation}
              disabled={permissions.assembly}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, pageRotation: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.assembly ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="pageRotation"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.assembly
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Page Rotation {permissions.assembly && "(required)"}
            </Label>
          </div>

          {/* Metadata Modification - Dependent on 'assembly' */}
          <div className={cn("flex items-center space-x-3", permissions.assembly && "opacity-60")}>
            <Checkbox
              id="metadataModification"
              checked={permissions.metadataModification}
              disabled={permissions.assembly}
              onCheckedChange={(checked) =>
                onPermissionsChange({ ...permissions, metadataModification: !!checked })
              }
              className={cn(
                "data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
                permissions.assembly ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
            <Label
              htmlFor="metadataModification"
              className={cn(
                "font-inter text-sm font-normal",
                permissions.assembly
                  ? "cursor-not-allowed text-slate-600"
                  : "cursor-pointer text-slate-800"
              )}
            >
              Disallow Metadata Modification {permissions.assembly && "(required)"}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

PdfExportPermissionsStep.displayName = "PdfExportPermissionsStep";
