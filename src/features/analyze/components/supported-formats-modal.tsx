"use client";

import { motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * An array of objects defining the supported image formats and their descriptions.
 * This data is used to populate the list within the modal.
 */
const supportedFormats = [
  {
    name: "JPEG / JPG",
    description:
      "A widely supported format using lossy compression, ideal for photographic images. Note that high compression can introduce artifacts which may affect analytical precision.",
  },
  {
    name: "PNG",
    description:
      "A lossless compression format that preserves all original image data, making it excellent for detailed scientific images where quality is critical. It also supports transparency.",
  },
  {
    name: "WebP",
    description:
      "A modern format offering superior lossless and lossy compression. It often yields smaller files than JPEG and PNG at equivalent quality, making it a versatile choice for web applications.",
  },
  {
    name: "HEIF / HEIC",
    description:
      "A high-efficiency format offering significant compression advantages over JPEG. While native to modern Apple devices, its compatibility across other platforms is still evolving.",
  },
];

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.4,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "tween",
      ease: "easeOut",
      duration: 0.5,
    },
  },
};

/**
 * Defines the props required by the component.
 */
interface SupportedFormatsModalProps {
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal dialog component that displays a list of supported image file formats.
 *
 * @param {SupportedFormatsModalProps} props The props for controlling the modal's state.
 * @returns A React component representing the modal.
 */
export function SupportedFormatsModal({ isOpen, onOpenChange }: SupportedFormatsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants}>
            <DialogHeader>
              <DialogTitle className="font-plus-jakarta-sans text-center text-lg">
                Supported File Formats
              </DialogTitle>
              <DialogDescription className="font-inter pt-2 text-center">
                Upload an image in one of the formats listed below. Files in other formats may not
                be processed correctly.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Scrollable container for the list of supported formats. */}
          <div className="font-inter grid gap-4 overflow-y-auto py-4 pr-3">
            {supportedFormats.map((format) => (
              // Each format item is individually animated.
              <motion.div key={format.name} className="flex flex-col" variants={itemVariants}>
                <h4 className="font-semibold text-slate-800">{format.name}</h4>
                <p className="text-sm text-slate-600">{format.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
