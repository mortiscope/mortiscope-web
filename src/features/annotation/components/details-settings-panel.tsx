"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";
import { GoVerified } from "react-icons/go";
import { IoEyeOutline, IoSettingsOutline, IoTrashBinOutline } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Dynamically import the delete modal component
const DynamicEditorDeleteImageModal = dynamic(() =>
  import("@/features/annotation/components/editor-delete-image-modal").then(
    (module) => module.EditorDeleteImageModal
  )
);

// Dynamically import the verify all detections modal component
const DynamicVerifyAllDetectionsModal = dynamic(() =>
  import("@/features/annotation/components/verify-all-detections-modal").then(
    (module) => module.VerifyAllDetectionsModal
  )
);

/**
 * A presentational component that renders the settings content for the editor's details panel.
 * It provides interface controls for filtering annotations and performing high-level image actions.
 */
export const DetailsSettingsPanel = () => {
  // Get route parameters
  const params = useParams();
  const resultsId = typeof params.resultsId === "string" ? params.resultsId : "";
  const imageId = typeof params.imageId === "string" ? params.imageId : "";

  // Fetch current image data
  const { image } = useEditorImage();

  // Fetch case data to get total image count
  const { totalImages } = useAnnotatedData(resultsId);

  // Get display filter from store
  const displayFilter = useAnnotationStore((state) => state.displayFilter);
  const setDisplayFilter = useAnnotationStore((state) => state.setDisplayFilter);

  // Get lock state from store
  const isLocked = useAnnotationStore((state) => state.isLocked);

  // Local state for modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerifyAllModalOpen, setIsVerifyAllModalOpen] = useState(false);

  // Derived state for switches based on display filter
  const showAll = displayFilter === "all";
  const showVerified = displayFilter === "verified";
  const showUnverified = displayFilter === "unverified";

  return (
    <div className="space-y-8">
      {/* Display Filters Section */}
      <div className="space-y-3">
        {/* Section Header */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0 }}
          className="flex items-center gap-2 pb-2"
        >
          <IoEyeOutline className="h-6 w-6 text-sky-300" />
          <h3 className="font-plus-jakarta-sans font-semibold tracking-wide text-sky-200 uppercase">
            Display Filters
          </h3>
        </motion.div>

        {/* Individual filter toggles. */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.05 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-all"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showAll}
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("all");
              }}
            />
            <span className="font-inter text-sm text-white">Show all annotations</span>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-verified"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showVerified}
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("verified");
              }}
            />
            <span className="font-inter text-sm text-white">Show only verified</span>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-unverified"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showUnverified}
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("unverified");
              }}
            />
            <span className="font-inter text-sm text-white">Show only unverified</span>
          </motion.div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="space-y-3">
        {/* Section Header */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.2 }}
          className="flex items-center gap-2 pb-2"
        >
          <IoSettingsOutline className="h-6 w-6 text-teal-300" />
          <h3 className="font-plus-jakarta-sans font-semibold tracking-wide text-teal-200 uppercase">
            Image Actions
          </h3>
        </motion.div>

        {/* Individual action buttons. */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.25 }}
          >
            <div className={isLocked ? "cursor-not-allowed" : ""}>
              <Button
                variant="outline"
                onClick={() => setIsVerifyAllModalOpen(true)}
                disabled={isLocked}
                className="font-inter group h-10 w-full justify-start rounded-lg border-1 border-white bg-transparent text-left font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-emerald-500 hover:bg-emerald-500 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white disabled:hover:bg-transparent md:border-2"
                aria-label="Verify all detections"
              >
                <GoVerified className="mr-2 h-6 w-6 flex-shrink-0 text-white transition-colors duration-300 ease-in-out group-hover:text-white" />
                Verify All Detections
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.3 }}
          >
            <div className={isLocked ? "cursor-not-allowed" : ""}>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isLocked}
                className="font-inter group h-10 w-full justify-start rounded-lg border-1 border-white bg-transparent text-left font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-rose-400 hover:bg-rose-400 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white disabled:hover:bg-transparent md:border-2"
                aria-label="Delete image"
              >
                <IoTrashBinOutline className="mr-2 h-6 w-6 flex-shrink-0 text-white transition-colors duration-300 ease-in-out group-hover:text-white" />
                Delete Image
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Verify All Detections Modal */}
      <DynamicVerifyAllDetectionsModal
        imageName={image?.name || null}
        isOpen={isVerifyAllModalOpen}
        onOpenChange={setIsVerifyAllModalOpen}
      />

      {/* Delete Image Modal */}
      <DynamicEditorDeleteImageModal
        imageId={imageId}
        imageName={image?.name || null}
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        totalImages={totalImages}
      />
    </div>
  );
};

DetailsSettingsPanel.displayName = "DetailsSettingsPanel";
