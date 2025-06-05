"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LuTrash2 } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { formatBytes } from "@/lib/utils";

/**
 * A small component that creates a temporary local URL for a File object and renders it as an image thumbnail.
 */
const Thumbnail = ({ file }: { file: File }) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    // Create a blob URL from the file.
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Cleanup function to revoke the object URL to free up memory when the component unmounts.
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Render a skeleton loader while the image is loading.
  if (!previewUrl) {
    return <div className="h-10 w-10 flex-shrink-0 rounded-md bg-slate-200" />;
  }

  return (
    // Enforces the square aspect ratio and clips the image.
    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
      <Image
        src={previewUrl}
        alt={`Preview of ${file.name}`}
        fill
        className="object-cover"
        sizes="40px"
      />
    </div>
  );
};

/**
 * Renders a list of the currently uploaded files, with animations for adding and removing items.
 */
export const UploadPreview = () => {
  // Retrieves the list of files and the removeFile action from the store.
  const files = useAnalyzeStore((state) => state.data.files);
  const removeFile = useAnalyzeStore((state) => state.removeFile);

  // If there are no files, this component renders nothing.
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 w-full">
      {/* Container for the file list, using a responsive grid layout. */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
        <AnimatePresence>
          {files.map((file) => (
            <motion.div
              key={file.name}
              // Animates the item's position when the layout changes.
              layout
              // Initial state before entering.
              initial={{ opacity: 0, y: -10 }}
              // State to animate to on entering.
              animate={{ opacity: 1, y: 0 }}
              // State to animate to on exiting.
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                opacity: { duration: 0.4 },
                scale: { duration: 0.4 },
              }}
              className="font-inter flex cursor-pointer items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 p-2 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 sm:p-3"
            >
              {/* Left section containing the thumbnail and file details. */}
              <div className="flex min-w-0 items-center gap-3">
                <Thumbnail file={file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-normal text-slate-700 sm:text-base">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 sm:text-sm">{formatBytes(file.size)}</p>
                </div>
              </div>
              {/* Right section with the button to remove the file. */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.name)}
                aria-label={`Remove ${file.name}`}
                className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
              >
                <LuTrash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
