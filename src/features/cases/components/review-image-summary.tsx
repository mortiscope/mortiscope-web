import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import React, { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the review image summary component.
 */
interface ReviewImageSummaryProps {
  /** The pre-sorted array of files to be displayed in the grid. */
  sortedFiles: UploadableFile[];
  /** A callback function invoked when an image is clicked, typically to open a preview modal. */
  onImageClick: (file: UploadableFile) => void;
  /** A utility function to get the correct preview URL for a given file. */
  getPreviewUrl: (file: UploadableFile) => string;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
}

/**
 * A memoized component that displays a responsive grid of uploaded image previews.
 * The number of visible thumbnails and the grid layout adapt to different screen sizes.
 */
export const ReviewImageSummary = memo(
  ({ sortedFiles, onImageClick, getPreviewUrl, variants }: ReviewImageSummaryProps) => {
    return (
      // The main animated container for the image summary card.
      <motion.div variants={variants}>
        <Card className="rounded-2xl border-2 border-slate-200 shadow-none">
          <CardHeader className="py-0 text-center md:text-left">
            <CardTitle className="font-plus-jakarta-sans text-lg">Image Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Renders a message if no images have been uploaded. */}
            {sortedFiles.length === 0 ? (
              <p className="font-inter text-muted-foreground">No images were uploaded.</p>
            ) : (
              <>
                {/* Large Screen Layout */}
                <div className="hidden grid-cols-5 gap-4 lg:grid">
                  {/* Renders up to the first 4 images directly. */}
                  {sortedFiles.slice(0, 4).map((file) => (
                    <button
                      key={file.id}
                      onClick={() => onImageClick(file)}
                      className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                    >
                      <Image
                        src={getPreviewUrl(file)}
                        alt={`Uploaded image ${file.name}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </button>
                  ))}
                  {/* If there are 5 or more images, the 5th thumbnail acts as a "View All" trigger. */}
                  {sortedFiles.length >= 5 && (
                    <button
                      onClick={() => onImageClick(sortedFiles[4])}
                      className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                    >
                      <Image
                        src={getPreviewUrl(sortedFiles[4])}
                        alt={sortedFiles.length > 5 ? "More images" : `Uploaded image 5`}
                        fill
                        unoptimized
                        className={cn("object-cover", sortedFiles.length > 5 && "blur-sm")}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {/* If there are more than 5 images, an overlay is shown with the count. */}
                      {sortedFiles.length > 5 && (
                        <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                          <span className="text-2xl font-bold">+{sortedFiles.length - 4}</span>
                          <span>View All</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>

                {/* Medium Screen Layout */}
                <div className="hidden grid-cols-3 gap-4 sm:grid lg:hidden">
                  {sortedFiles.slice(0, 2).map((file) => (
                    <button
                      key={file.id}
                      onClick={() => onImageClick(file)}
                      className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                    >
                      <Image
                        src={getPreviewUrl(file)}
                        alt={`Uploaded image ${file.name}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </button>
                  ))}
                  {sortedFiles.length >= 3 && (
                    <button
                      onClick={() => onImageClick(sortedFiles[2])}
                      className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                    >
                      <Image
                        src={getPreviewUrl(sortedFiles[2])}
                        alt={sortedFiles.length > 3 ? "More images" : `Uploaded image 3`}
                        fill
                        unoptimized
                        className={cn("object-cover", sortedFiles.length > 3 && "blur-sm")}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {sortedFiles.length > 3 && (
                        <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                          <span className="text-2xl font-bold">+{sortedFiles.length - 2}</span>
                          <span>View All</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>

                {/* Small Screen Layout */}
                <div className="grid grid-cols-2 gap-4 sm:hidden">
                  {sortedFiles.slice(0, 1).map((file) => (
                    <button
                      key={file.id}
                      onClick={() => onImageClick(file)}
                      className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                    >
                      <Image
                        src={getPreviewUrl(file)}
                        alt={`Uploaded image ${file.name}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </button>
                  ))}
                  {sortedFiles.length >= 2 && (
                    <button
                      onClick={() => onImageClick(sortedFiles[1])}
                      className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                    >
                      <Image
                        src={getPreviewUrl(sortedFiles[1])}
                        alt={sortedFiles.length > 2 ? "More images" : `Uploaded image 2`}
                        fill
                        unoptimized
                        className={cn("object-cover", sortedFiles.length > 2 && "blur-sm")}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {sortedFiles.length > 2 && (
                        <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                          <span className="text-2xl font-bold">+{sortedFiles.length - 1}</span>
                          <span>View All</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

ReviewImageSummary.displayName = "ReviewImageSummary";
