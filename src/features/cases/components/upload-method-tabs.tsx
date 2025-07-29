import { motion } from "framer-motion";
import { Camera, Upload as UploadIcon } from "lucide-react";
import { memo } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type UploadMethodTabsProps = {
  activeTab: string;
  onTabChange: (value: string) => void;
  isMaxFilesReached: boolean;
};

/**
 * Renders the tabs for selecting an upload method (file upload or camera).
 */
export const UploadMethodTabs = memo(
  ({ activeTab, onTabChange, isMaxFilesReached }: UploadMethodTabsProps) => {
    return (
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
      </Tabs>
    );
  }
);

UploadMethodTabs.displayName = "UploadMethodTabs";
