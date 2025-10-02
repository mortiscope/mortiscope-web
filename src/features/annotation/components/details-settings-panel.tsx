"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";
import { GoVerified } from "react-icons/go";
import {
  IoEyeOutline,
  IoLayersOutline,
  IoSettingsOutline,
  IoTrashBinOutline,
} from "react-icons/io5";
import { PiBoundingBox } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PanelSectionHeader } from "@/features/annotation/components/panel-section-header";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { cn } from "@/lib/utils";

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

  // Get class filter from store
  const classFilter = useAnnotationStore((state) => state.classFilter);
  const toggleClassFilter = useAnnotationStore((state) => state.toggleClassFilter);

  // Get view mode from store
  const viewMode = useAnnotationStore((state) => state.viewMode);
  const setViewMode = useAnnotationStore((state) => state.setViewMode);

  // Get lock state from store
  const isLocked = useAnnotationStore((state) => state.isLocked);

  // Get detections from store to check if image has any
  const detections = useAnnotationStore((state) => state.detections);
  const hasDetections = detections.length > 0;

  // Check if all detections are already verified
  const allDetectionsVerified =
    hasDetections &&
    detections.every((d) => d.status === "user_confirmed" || d.status === "user_edited_confirmed");

  // Local state for modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerifyAllModalOpen, setIsVerifyAllModalOpen] = useState(false);

  // Derived state for switches based on display filter
  const showAll = displayFilter === "all";
  const showVerified = displayFilter === "verified";
  const showUnverified = displayFilter === "unverified";

  return (
    <div className="space-y-8">
      {/* Layer Visibility Section */}
      <div className="space-y-3">
        {/* Section Header */}
        <PanelSectionHeader
          icon={IoLayersOutline}
          title="Layer Visibility"
          colorVariant="amber"
          delay={0}
        />

        {/* Visibility toggles */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.05 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-image"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={viewMode !== "annotations_only" && viewMode !== "none"}
              onCheckedChange={(checked) => {
                // Determine new mode based on current state of the other switch
                const annotationsVisible = viewMode !== "image_only" && viewMode !== "none";

                if (checked) {
                  // Turning image on
                  setViewMode(annotationsVisible ? "all" : "image_only");
                } else {
                  // Turning image off
                  setViewMode(annotationsVisible ? "annotations_only" : "none");
                }
              }}
            />
            <span className="font-inter text-sm text-white">Show Image</span>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-annotations"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={viewMode !== "image_only" && viewMode !== "none"}
              onCheckedChange={(checked) => {
                // Determine new mode based on current state of the other switch
                const imageVisible = viewMode !== "annotations_only" && viewMode !== "none";

                if (checked) {
                  // Turning annotations on
                  setViewMode(imageVisible ? "all" : "annotations_only");
                } else {
                  // Turning annotations off
                  setViewMode(imageVisible ? "image_only" : "none");
                }
              }}
            />
            <span className="font-inter text-sm text-white">Show Annotations</span>
          </motion.div>
        </div>
      </div>

      {/* Display Filters Section */}
      <div
        className={cn(
          "space-y-3",
          (viewMode === "image_only" || viewMode === "none" || classFilter.length === 0) &&
            "cursor-not-allowed opacity-50"
        )}
      >
        {/* Section Header */}
        <PanelSectionHeader
          icon={IoEyeOutline}
          title="Display Filters"
          colorVariant="sky"
          delay={0.15}
        />

        {/* Individual filter toggles. */}
        <div
          className={cn(
            "space-y-4",
            classFilter.length === 0 && "cursor-not-allowed opacity-50",
            (viewMode === "image_only" || viewMode === "none" || classFilter.length === 0) &&
              "pointer-events-none"
          )}
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-all"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showAll && classFilter.length > 0}
              disabled={
                classFilter.length === 0 || viewMode === "image_only" || viewMode === "none"
              }
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("all");
              }}
            />
            <span className="font-inter text-sm text-white">Show all annotations</span>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.25 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-verified"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showVerified && classFilter.length > 0}
              disabled={
                classFilter.length === 0 || viewMode === "image_only" || viewMode === "none"
              }
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("verified");
              }}
            />
            <span className="font-inter text-sm text-white">Show only verified</span>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <Switch
              id="show-unverified"
              className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
              checked={showUnverified && classFilter.length > 0}
              disabled={
                classFilter.length === 0 || viewMode === "image_only" || viewMode === "none"
              }
              onCheckedChange={(checked) => {
                if (checked) setDisplayFilter("unverified");
              }}
            />
            <span className="font-inter text-sm text-white">Show only unverified</span>
          </motion.div>
        </div>
      </div>

      {/* Class Filters Section */}
      <div
        className={cn(
          "space-y-3",
          (viewMode === "image_only" || viewMode === "none") &&
            "pointer-events-none cursor-not-allowed opacity-50"
        )}
      >
        {/* Section Header */}
        <PanelSectionHeader
          icon={PiBoundingBox}
          title="Class Filters"
          colorVariant="violet"
          delay={0.35}
        />

        {/* Individual class filter toggles. */}
        <div className="space-y-4">
          {[
            { id: "instar_1", label: "Show Instar 1 only" },
            { id: "instar_2", label: "Show Instar 2 only" },
            { id: "instar_3", label: "Show Instar 3 only" },
            { id: "pupa", label: "Show Pupa only" },
            { id: "adult", label: "Show Adult only" },
          ].map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 150,
                delay: 0.4 + index * 0.05,
              }}
              className="flex items-center gap-3"
            >
              <Switch
                id={`show-${item.id}`}
                className="cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-emerald-200"
                checked={
                  classFilter.includes(item.id) && viewMode !== "image_only" && viewMode !== "none"
                }
                onCheckedChange={() => {
                  const willBeEnabled = !classFilter.includes(item.id);
                  const newClassFilterLength = willBeEnabled
                    ? classFilter.length + 1
                    : classFilter.length - 1;

                  toggleClassFilter(item.id);

                  if (newClassFilterLength === 0) {
                    if (viewMode === "all") setViewMode("image_only");
                    else if (viewMode === "annotations_only") setViewMode("none");
                  } else if (classFilter.length === 0 && willBeEnabled) {
                    if (viewMode === "image_only") setViewMode("all");
                    else if (viewMode === "none") setViewMode("annotations_only");
                  }
                }}
                disabled={viewMode === "image_only" || viewMode === "none"}
              />
              <span className="font-inter text-sm text-white">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div className="space-y-3">
        {/* Section Header */}
        <PanelSectionHeader
          icon={IoSettingsOutline}
          title="Image Actions"
          colorVariant="teal"
          delay={0.65}
        />

        {/* Individual action buttons. */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.7 }}
          >
            <div
              className={
                isLocked || !hasDetections || allDetectionsVerified ? "cursor-not-allowed" : ""
              }
            >
              <Button
                variant="outline"
                onClick={() => setIsVerifyAllModalOpen(true)}
                disabled={isLocked || !hasDetections || allDetectionsVerified}
                className="font-inter group h-10 w-full cursor-pointer justify-start rounded-lg border-1 border-white bg-transparent text-left font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-emerald-500 hover:bg-emerald-500 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white disabled:hover:bg-transparent md:border-2"
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
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.75 }}
          >
            <div className={isLocked ? "cursor-not-allowed" : ""}>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isLocked}
                className="font-inter group h-10 w-full cursor-pointer justify-start rounded-lg border-1 border-white bg-transparent text-left font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-rose-400 hover:bg-rose-400 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white disabled:hover:bg-transparent md:border-2"
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
