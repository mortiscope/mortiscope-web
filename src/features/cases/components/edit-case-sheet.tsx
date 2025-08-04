"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import * as React from "react";
import { Controller } from "react-hook-form";
import { HiMiniListBullet } from "react-icons/hi2";
import { BeatLoader } from "react-spinners";

import { Form } from "@/components/ui/form";
import { EditCaseForm } from "@/features/cases/components/edit-case-form";
import { EditCaseTabs } from "@/features/cases/components/edit-case-tabs";
import { useEditCaseForm } from "@/features/cases/hooks/use-edit-case-form";
import { EditCaseSheetFooter } from "@/features/results/components/edit-case-sheet-footer";
import { EditCaseSheetHeader } from "@/features/results/components/edit-case-sheet-header";
import { type CaseWithRelations } from "@/features/results/components/results-view";
import { cn } from "@/lib/utils";

const DynamicCaseNoteEditor = dynamic(
  () =>
    import("@/features/cases/components/case-note-editor").then((module) => module.CaseNoteEditor),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center p-6">
        <BeatLoader color="#16a34a" size={12} />
      </div>
    ),
    ssr: false,
  }
);

/**
 * Defines the props for the edit case sheet component.
 */
interface EditCaseSheetProps {
  /** The full case data object, passed to the `useEditCaseForm` hook. */
  caseData: CaseWithRelations;
  /** Controls whether the sheet is open or closed. */
  isOpen: boolean;
  /** A callback function that is triggered when the sheet's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  /** Optional class name to apply to the sheet content for custom styling. */
  className?: string;
}

/**
 * A shared motion component for tab content to ensure consistent animations and style isolation.
 */
const MotionTabContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  // Defines the animation variants for the tab content.
  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={contentVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn("h-full", className)}
    >
      {children}
    </motion.div>
  );
};

/**
 * A smart component that renders a customized, animated slide-out sheet for editing case details.
 * It uses the `useEditCaseForm` hook to manage all its state and logic, and it orchestrates
 * the rendering of the header, tabs, form content, and footer.
 */
export const ResultsEditCaseSheet = ({
  caseData,
  isOpen,
  onOpenChange,
  className,
}: EditCaseSheetProps) => {
  // Initializes the master hook that provides all state and logic for the form.
  const {
    form,
    activeTab,
    setActiveTab,
    lockedFields,
    toggleLock,
    addressData,
    onSubmit,
    isButtonDisabled,
    isSubmitting,
  } = useEditCaseForm({ caseData, onSheetClose: () => onOpenChange(false) });

  /**
   * A function that conditionally renders the content for the currently active tab.
   * It uses Framer Motion's `AnimatePresence` to create smooth, animated transitions
   * when the user switches between tabs.
   */
  const renderTabContent = () => {
    return (
      // `AnimatePresence` manages the entry and exit animations of the tab content.
      <AnimatePresence mode="wait">
        {activeTab === "details" && (
          <MotionTabContent key="details">
            {addressData.isLoading ? (
              // Shows a loading spinner while the initial address data is being fetched.
              <div className="flex h-full items-center justify-center p-6">
                <BeatLoader color="#16a34a" size={12} />
              </div>
            ) : (
              // Renders the main form content once data is available.
              <EditCaseForm
                form={form}
                lockedFields={lockedFields}
                toggleLock={toggleLock}
                regionList={addressData.regionList}
                provinceList={addressData.provinceList}
                cityList={addressData.cityList}
                barangayList={addressData.barangayList}
              />
            )}
          </MotionTabContent>
        )}
        {activeTab === "notes" && (
          <MotionTabContent key="notes">
            {/* Renders the notes editor, connecting it to the form state via a controller. */}
            <Controller
              name="notes"
              control={form.control}
              render={({ field }) => (
                <DynamicCaseNoteEditor value={field.value ?? ""} onChange={field.onChange} />
              )}
            />
          </MotionTabContent>
        )}
        {activeTab === "history" && (
          <MotionTabContent key="history">
            {/* Placeholder content for the 'history' tab. */}
            <div className="flex h-full flex-col items-center justify-center p-6 text-slate-500">
              <HiMiniListBullet className="mb-4 h-12 w-12 text-slate-300" />
              No history available.
            </div>
          </MotionTabContent>
        )}
      </AnimatePresence>
    );
  };

  return (
    <SheetPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-500 ease-in-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <SheetPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white transition ease-in-out data-[state=closed]:duration-500 data-[state=open]:duration-500 sm:max-w-md",
            className
          )}
          // Prevents the sheet from automatically focusing on the first focusable element.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <EditCaseSheetHeader />
          <EditCaseTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {/* The `react-hook-form` provider, which makes the form instance available to all child components. */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="font-inter flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {/* The main scrollable area for the form content. */}
              <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
              <EditCaseSheetFooter
                activeTab={activeTab}
                isSubmitting={isSubmitting}
                isDisabled={isButtonDisabled}
              />
            </form>
          </Form>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
};
