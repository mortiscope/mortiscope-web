"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Upload as UploadIcon } from "lucide-react";
import { useState } from "react";
import { BsCamera } from "react-icons/bs";
import { IoImagesOutline } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * Renders the initial step of the analysis workflow.
 * Allows the user to either upload an image file or prepare to use their device's camera.
 */
export const AnalyzeUpload = () => {
  // Retrieves state and actions from the global analysis store.
  const nextStep = useAnalyzeStore((state) => state.nextStep);
  const imageFile = useAnalyzeStore((state) => state.data.imageFile);
  // Manages the currently selected tab ("upload" or "camera").
  const [activeTab, setActiveTab] = useState("upload");

  // Determines if the 'Next' button should be disabled based on whether an image has been uploaded.
  const isNextDisabled = !imageFile;

  // Defines reusable CSS class strings for consistent styling and easier maintenance.
  const dropzoneBaseClasses =
    "mt-4 group flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-center transition-colors duration-300 ease-in-out";
  const dropzoneHoverClasses =
    "hover:border-solid hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20";
  const iconClasses =
    "h-12 w-12 text-emerald-500 transition-transform duration-300 ease-in-out group-hover:-translate-y-2 group-hover:scale-110";
  const largeTextClasses =
    "font-plus-jakarta-sans mt-4 font-semibold md:text-xl text-lg text-slate-700 transition-colors duration-300 ease-in-out group-hover:text-slate-900";
  const descriptionTextClasses =
    "font-inter mt-1 max-w-sm text-sm text-slate-500 transition-colors duration-300 ease-in-out group-hover:text-slate-600";

  // Defines the animation variants for the tab content, creating a smooth fade and slide effect.
  const contentVariants = {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" },
  };

  return (
    // The main container for the upload component.
    <Card className="border-none py-2 shadow-none">
      {/* Header section with title and description. */}
      <CardHeader className="px-0 text-center">
        <CardTitle className="font-plus-jakarta-sans text-xl">Provide an Image</CardTitle>
        <CardDescription className="font-inter">
          Choose to upload an image file or take a new one with your device's camera.
        </CardDescription>
      </CardHeader>
      {/* Main content area containing the tabs and dropzone. */}
      <CardContent className="px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* The list of tab triggers ('Upload Image', 'Use Camera'). */}
          <TabsList className="font-inter grid h-12 w-full grid-cols-2 bg-emerald-600 p-1.5 md:h-14 md:p-2">
            {/* Trigger for the 'Upload Image' tab. */}
            <TabsTrigger
              value="upload"
              className="relative cursor-pointer font-medium text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {activeTab === "upload" && (
                <motion.div
                  layoutId="active-tab-pill"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                  className="absolute inset-0 rounded-md bg-emerald-500"
                />
              )}
              <span className="relative z-10 flex items-center">
                <UploadIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload Image</span>
              </span>
            </TabsTrigger>

            {/* Trigger for the 'Use Camera' tab. */}
            <TabsTrigger
              value="camera"
              className="relative cursor-pointer font-medium text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {activeTab === "camera" && (
                <motion.div
                  layoutId="active-tab-pill"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                  className="absolute inset-0 rounded-md bg-emerald-500"
                />
              )}
              <span className="relative z-10 flex items-center">
                <Camera className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Use Camera</span>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* The dropzone area where tab content is displayed. */}
          <div className={`${dropzoneBaseClasses} ${dropzoneHoverClasses}`}>
            <AnimatePresence mode="wait">
              {/* Content for the 'Upload' tab. */}
              {activeTab === "upload" && (
                <motion.div
                  key="upload"
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={contentVariants.transition}
                  className="flex flex-col items-center"
                >
                  <IoImagesOutline className={iconClasses} />
                  <p className={largeTextClasses}>Upload from Device</p>
                  <p className={descriptionTextClasses}>
                    Click to browse or drag and drop up to 4 file images of PNG, JPG, or HEIF.
                    Maximum file size is 10MB.
                  </p>
                </motion.div>
              )}

              {/* Content for the 'Camera' tab. */}
              {activeTab === "camera" && (
                <motion.div
                  key="camera"
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={contentVariants.transition}
                  className="flex flex-col items-center"
                >
                  <BsCamera className={iconClasses} />
                  <p className={largeTextClasses}>Use Camera</p>
                  <p className={descriptionTextClasses}>
                    Allow access to your device's camera to capture a new image for analysis.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </CardContent>

      {/* Footer section containing the primary action button. */}
      <CardFooter className="flex justify-end px-0">
        <Button
          onClick={nextStep}
          disabled={isNextDisabled}
          className="font-inter relative mt-2 h-9 w-1/2 cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:text-base"
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );
};
