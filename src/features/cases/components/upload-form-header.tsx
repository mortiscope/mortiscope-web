import { memo } from "react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Renders the header for the file upload section.
 */
export const UploadFormHeader = memo(() => {
  return (
    <CardHeader className="px-0 text-center">
      <CardTitle className="font-plus-jakarta-sans text-xl">Provide an Image</CardTitle>
      <CardDescription className="font-inter">
        Choose to upload an image file or take a new one with your device&apos;s camera.
      </CardDescription>
    </CardHeader>
  );
});

UploadFormHeader.displayName = "UploadFormHeader";
