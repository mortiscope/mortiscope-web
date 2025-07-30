import { AnimatePresence, motion } from "framer-motion";
import React, { memo } from "react";

import { ImageCard } from "@/features/results/components/image-card";
import { type ImageFile } from "@/features/results/components/results-images";

/**
 * Defines the props for the ImageGrid component. It inherits all props from `ImageCard`
 * except for `imageFile`, as it manages the mapping of the `images` array internally.
 */
interface ImageGridProps extends Omit<React.ComponentProps<typeof ImageCard>, "imageFile"> {
  /** The array of image file objects to be rendered in the grid. */
  images: ImageFile[];
}

/**
 * A memoized component that renders a responsive, horizontally scrollable, and animated grid of `ImageCard` components.
 * It orchestrates the layout and animations of its children.
 */
export const ImageGrid = memo(({ images, ...cardProps }: ImageGridProps) => {
  return (
    // The main animated container.
    <motion.div
      key={cardProps.sortOption}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="group w-full overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent group-hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="grid auto-cols-[calc(50%-6px)] grid-flow-col gap-3 md:auto-cols-[calc(25%-9px)] lg:auto-cols-[calc(20%-9.6px)]">
          <AnimatePresence>
            {images.map((imageFile) => (
              <ImageCard
                key={imageFile.id}
                imageFile={imageFile}
                // Spreads the remaining props down to each `ImageCard`.
                {...cardProps}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

ImageGrid.displayName = "ImageGrid";
