"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Upload as UploadIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { BsCamera } from "react-icons/bs";
import { IoImagesOutline } from "react-icons/io5";
import { toast } from "sonner";

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
import { SupportedFormatsModal } from "@/features/analyze/components/supported-formats-modal";
import { UploadPreview } from "@/features/analyze/components/upload-preview";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE, MAX_FILES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Renders the initial step of the analysis workflow.
 * Allows the user to either upload an image file or prepare to use their device's camera.
 */
export const AnalyzeUpload = () => {
  // Retrieves state and actions from the global analysis store.
  const nextStep = useAnalyzeStore((state) => state.nextStep);
  const files = useAnalyzeStore((state) => state.data.files);
  const addFiles = useAnalyzeStore((state) => state.addFiles);
  const filesCount = files.length;

  // Manages the currently selected tab ("upload" or "camera").
  const [activeTab, setActiveTab] = useState("upload");
  // State to manage the visibility of the supported formats modal.
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Checks if the maximum number of files has been reached.
  const isMaxFilesReached = filesCount >= MAX_FILES;

  // Memoized callback for handling file drops.
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Handle file rejections from react-dropzone with individual toast notifications.
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          let message = `Error with ${file.name}: ${error.message}`;
          if (error.code === "file-too-large") {
            message = `${file.name} is larger than 10MB.`;
          } else if (error.code === "file-invalid-type") {
            message = `${file.name} is not a supported file type.`;
          } else if (error.code === "too-many-files") {
            message = `You can only upload a maximum of ${MAX_FILES} images in total.`;
          }
          toast.error(message);
        });
      });

      // Check if adding the new files would exceed the maximum limit.
      if (filesCount + acceptedFiles.length > MAX_FILES) {
        toast.error(`You can only upload a maximum of ${MAX_FILES} images.`);
        return;
      }

      // Check for duplicate files before adding.
      const currentFileNames = new Set(files.map((f) => f.name));
      const uniqueNewFiles: File[] = [];

      acceptedFiles.forEach((file) => {
        if (currentFileNames.has(file.name)) {
          // Fire a toast for each individual duplicate file.
          toast.error(`${file.name} is already in the upload list.`);
        } else {
          uniqueNewFiles.push(file);
        }
      });

      // Add the unique, accepted files to the global state.
      if (uniqueNewFiles.length > 0) {
        addFiles(uniqueNewFiles);
        // Show one aggregated success toast for a better user experience.
        toast.success(
          `${uniqueNewFiles.length} ${
            uniqueNewFiles.length > 1 ? "files" : "file"
          } added successfully.`
        );
      }
    },
    [addFiles, files, filesCount]
  );

  // Configure the dropzone hook with validation rules.
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    disabled: isMaxFilesReached,
  });

  // Determines if the "Next" button should be disabled.
  const isNextDisabled = filesCount === 0;

  // Defines reusable CSS class strings for consistent styling and easier maintenance.
  const dropzoneBaseClasses =
    "mt-4 group flex h-64 w-full flex-col items-center justify-center rounded-md border-2 border-dashed px-4 text-center transition-all duration-300 ease-in-out";
  const dropzoneStateClasses = isMaxFilesReached
    ? "cursor-not-allowed bg-slate-100 border-slate-300 opacity-60"
    : "cursor-pointer border-emerald-300 bg-emerald-50 hover:border-solid hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20";
  const dropzoneDragAcceptClasses = isDragAccept ? "!border-green-500 !bg-green-100" : "";
  const dropzoneDragRejectClasses = isDragReject
    ? "!border-rose-500 !bg-rose-100 hover:!border-rose-500 hover:!bg-rose-100 hover:!shadow-rose-500/20"
    : "";

  const iconClasses =
    "h-12 w-12 text-emerald-500 transition-transform duration-300 ease-in-out group-hover:-translate-y-2 group-hover:scale-110";
  const largeTextClasses =
    "font-plus-jakarta-sans mt-4 font-semibold md:text-xl text-lg transition-colors duration-300 ease-in-out group-hover:group-enabled:text-slate-900";
  const descriptionTextClasses =
    "font-inter mt-1 max-w-sm text-sm text-slate-500 transition-colors duration-300 ease-in-out group-hover:group-enabled:text-slate-600";

  // Defines the animation variants for the tab content, creating a smooth fade and slide effect.
  const contentVariants = {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" },
  };

  return (
    <>
      <SupportedFormatsModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      {/* The main container for the upload component. */}
      <Card className="border-none py-2 shadow-none">
        {/* Header section with title and description. */}
        <CardHeader className="px-0 text-center">
          <CardTitle className="font-plus-jakarta-sans text-xl">Provide an Image</CardTitle>
          <CardDescription className="font-inter">
            Choose to upload an image file or take a new one with your device&apos;s camera.
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
                disabled={isMaxFilesReached}
                className={cn(
                  "relative font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  !isMaxFilesReached && "cursor-pointer"
                )}
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
                disabled={isMaxFilesReached}
                className={cn(
                  "relative font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  !isMaxFilesReached && "cursor-pointer"
                )}
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
            <div
              {...getRootProps()}
              className={cn(
                dropzoneBaseClasses,
                dropzoneStateClasses,
                isDragActive && !isMaxFilesReached && "border-solid",
                dropzoneDragAcceptClasses,
                dropzoneDragRejectClasses
              )}
            >
              <input {...getInputProps()} />
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
                    <IoImagesOutline
                      className={cn(
                        iconClasses,
                        isDragReject ? "text-rose-500" : "text-emerald-500"
                      )}
                    />
                    <p
                      className={cn(
                        largeTextClasses,
                        isDragReject ? "text-rose-500" : "text-slate-700"
                      )}
                    >
                      {isMaxFilesReached
                        ? "Maximum files reached"
                        : isDragAccept
                          ? "Drop them here"
                          : "Upload from Device"}
                    </p>
                    <p className={descriptionTextClasses}>
                      {isMaxFilesReached
                        ? `You have uploaded the maximum of ${MAX_FILES} images`
                        : `Click to browse or drag and drop up to ${MAX_FILES - filesCount} more. Maximum file size
                      of 10MB each. See supported formats `}
                      {!isMaxFilesReached && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsModalOpen(true);
                          }}
                          className={cn(
                            "cursor-help font-medium focus:outline-none",
                            isDragReject ? "text-rose-500" : "text-emerald-600"
                          )}
                        >
                          here
                        </button>
                      )}
                      .
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
                    <BsCamera
                      className={cn(
                        iconClasses,
                        isDragReject ? "text-rose-500" : "text-emerald-500"
                      )}
                    />
                    <p
                      className={cn(
                        largeTextClasses,
                        isDragReject ? "text-rose-500" : "text-slate-700"
                      )}
                    >
                      {isMaxFilesReached ? "Maximum files reached" : "Use Camera"}
                    </p>
                    <p className={descriptionTextClasses}>
                      {isMaxFilesReached
                        ? `You have uploaded the maximum of ${MAX_FILES} images.`
                        : "Allow access to your device's camera to capture a new image for analysis."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
          {/* Renders the preview list of uploaded files */}
          <UploadPreview />
        </CardContent>

        {/* Footer section containing the primary action button. */}
        <CardFooter className="flex justify-end px-0">
          <div className={cn("mt-2 w-1/2 md:mt-0", isNextDisabled && "cursor-not-allowed")}>
            <Button
              onClick={nextStep}
              disabled={isNextDisabled}
              className="font-inter relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:before:left-full disabled:hover:shadow-none md:h-10 md:text-base"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};
