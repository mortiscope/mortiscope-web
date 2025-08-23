"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";

// Dynamically import the editor components.
const DynamicEditorHeader = dynamic(() =>
  import("@/features/annotation/components/editor-header").then((module) => module.EditorHeader)
);

const DynamicEditorSidebar = dynamic(() =>
  import("@/features/annotation/components/editor-sidebar").then((module) => module.EditorSidebar)
);

const DynamicEditorToolbar = dynamic(() =>
  import("@/features/annotation/components/editor-toolbar").then((module) => module.EditorToolbar)
);

const DynamicEditorImageDisplay = dynamic(() =>
  import("@/features/annotation/components/editor-image-display").then(
    (module) => module.EditorImageDisplay
  )
);

/**
 * Defines the props for the editor layout component.
 */
interface EditorLayoutProps {
  /** The main content of the page to be rendered within the layout structure. */
  children: React.ReactNode;
}

/**
 * A client-side layout component that provides the main structure for the annotation editor.
 * It orchestrates the rendering of the header, sidebar, and floating toolbar, and manages
 * the state for their interactions, particularly for responsive mobile views.
 *
 * @param {EditorLayoutProps} props The props for the component.
 * @returns A React component representing the full editor layout.
 */
export default function EditorLayout({ children }: EditorLayoutProps) {
  const pathname = usePathname();

  /**
   * A state to manage the visibility of the main sidebar specifically on mobile viewports.
   * */
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  /**
   * A state to track if any secondary details panel is currently visible.
   */
  const [hasOpenPanel, setHasOpenPanel] = useState(false);

  /**
   * A simple handler to toggle the visibility state of the mobile sidebar.
   */
  const handleToggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((prev) => !prev);
  }, []);

  /**
   * Fetch the image data if we're on an image edit route.
   */
  const { image, isLoading } = useEditorImage();

  /**
   * Check if the user is on an image edit route.
   */
  const isImageEditRoute = pathname?.includes("/image/") && pathname?.includes("/edit");

  return (
    // Wraps the entire layout in a tooltip provider to enable tooltips for all child components.
    <TooltipProvider>
      <div className="min-h-screen bg-emerald-100">
        {/* Renders the sticky top header, passing down state and handlers for mobile interactions. */}
        <DynamicEditorHeader
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={handleToggleMobileSidebar}
          hasOpenPanel={hasOpenPanel}
        />
        {/* Renders the fixed left sidebar. */}
        <DynamicEditorSidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onPanelStateChange={setHasOpenPanel}
        />
        {/* Renders the floating right-side toolbar for editor actions. */}
        <DynamicEditorToolbar hasOpenPanel={hasOpenPanel} />
        <main className={isImageEditRoute ? "md:ml-24" : "ml-16 md:ml-24"}>
          {/* Conditionally render the image display when on an image edit route. */}
          {isImageEditRoute && !isLoading && image ? (
            <DynamicEditorImageDisplay image={image} />
          ) : (
            children
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
