"use client";

import { motion, type Variants } from "framer-motion";
import { IoImagesOutline, IoLayersOutline, IoPhonePortraitOutline } from "react-icons/io5";
import { PiGlobeStand } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    icon: IoImagesOutline,
  },
  {
    name: "PNG",
    description:
      "A lossless compression format that preserves all original image data, making it excellent for detailed scientific images where quality is critical. It also supports transparency.",
    icon: IoLayersOutline,
  },
  {
    name: "WebP",
    description:
      "A modern format offering superior lossless and lossy compression. It often yields smaller files than JPEG and PNG at equivalent quality, making it a versatile choice for web applications.",
    icon: PiGlobeStand,
  },
  {
    name: "HEIF / HEIC",
    description:
      "A high-efficiency format offering significant compression advantages over JPEG. While native to modern Apple devices, its compatibility across other platforms is still evolving.",
    icon: IoPhonePortraitOutline,
  },
];

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.25,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
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
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Supported File Formats
              </DialogTitle>
              <DialogDescription className="font-inter text-center text-sm text-slate-600">
                Please upload an image in one of the approved formats.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
          >
            <ul className="font-inter grid gap-4">
              {supportedFormats.map((format) => (
                // Each format is a list item.
                <li
                  key={format.name}
                  className="flex items-start rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50"
                >
                  {/* Each format renders its own unique icon from the data array. */}
                  <format.icon className="mt-1 mr-4 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div>
                    <h4 className="font-semibold text-slate-800">{format.name}</h4>
                    <p className="text-sm text-slate-600">{format.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-0 pb-6 md:pt-2">
            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                className="font-inter relative mt-2 h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 px-6 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:w-auto md:text-base"
              >
                Got It
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

SupportedFormatsModal.displayName = "SupportedFormatsModal";
