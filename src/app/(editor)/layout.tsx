"use client";

import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { type ReactZoomPanPinchRef, type ReactZoomPanPinchState } from "react-zoom-pan-pinch";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { useIsMobile } from "@/hooks/use-mobile";

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

const DynamicEditorImageMinimap = dynamic(() =>
  import("@/features/annotation/components/editor-image-minimap").then(
    (module) => module.EditorImageMinimap
  )
);

const DynamicEditorDetectionPanel = dynamic(() =>
  import("@/features/annotation/components/editor-detection-panel").then(
    (module) => module.EditorDetectionPanel
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
  const isMobile = useIsMobile();
  const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);

  /**
   * A state to manage the visibility of the main sidebar specifically on mobile viewports.
   * */
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  /**
   * A state to track if any secondary details panel is currently visible.
   */
  const [hasOpenPanel, setHasOpenPanel] = useState(false);

  /**
   * A state to track if the minimap is enabled.
   */
  const [isMinimapEnabled, setIsMinimapEnabled] = useState(false);

  /**
   * State to track the transform state for the minimap.
   */
  const [transformState, setTransformState] = useState<ReactZoomPanPinchState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    previousScale: 1,
  });

  /**
   * State to hold the dynamic dimensions of the pan-zoom container for accurate minimap calculation.
   */
  const [viewingBox, setViewingBox] = useState<{
    content?: { width: number; height: number };
    wrapper?: { width: number; height: number };
  }>({});

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

  /**
   * A ref to access the react-zoom-pan-pinch instance for programmatic control.
   */
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  /**
   * Wrapper functions to control the zoom and pan of the image.
   */
  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut();
  }, []);

  const handleCenterView = useCallback(() => {
    transformRef.current?.centerView();
  }, []);

  const handleResetView = useCallback(() => {
    transformRef.current?.resetTransform();
  }, []);

  /**
   * Handler to toggle the minimap visibility.
   */
  const handleToggleMinimap = useCallback(() => {
    setIsMinimapEnabled((prev) => !prev);
  }, []);

  /**
   * Callback fired on any pan, zoom, or other transform.
   * It updates local state to reflect the transform and captures container dimensions for the minimap.
   */
  const handleTransformed = useCallback(
    (ref: ReactZoomPanPinchRef, state: { scale: number; positionX: number; positionY: number }) => {
      setTransformState((prevState) => ({ ...prevState, ...state }));
      const { contentComponent, wrapperComponent } = ref.instance;
      if (contentComponent && wrapperComponent) {
        setViewingBox({
          content: { width: contentComponent.clientWidth, height: contentComponent.clientHeight },
          wrapper: { width: wrapperComponent.clientWidth, height: wrapperComponent.clientHeight },
        });
      }
    },
    []
  );

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
        <DynamicEditorToolbar
          hasOpenPanel={hasOpenPanel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCenterView={handleCenterView}
          onResetView={handleResetView}
          isMinimapEnabled={isMinimapEnabled}
          onToggleMinimap={handleToggleMinimap}
        />
        <main className={isImageEditRoute ? "md:ml-24" : "ml-16 md:ml-24"}>
          {/* Conditionally render the image display when on an image edit route. */}
          {isImageEditRoute && !isLoading && image ? (
            <DynamicEditorImageDisplay
              ref={transformRef}
              image={image}
              onTransformed={handleTransformed}
            />
          ) : (
            children
          )}
        </main>
        {/* Conditionally render the minimap when enabled and on an image edit route. */}
        <AnimatePresence>
          {isImageEditRoute && !isLoading && image && isMinimapEnabled && (
            <DynamicEditorImageMinimap
              key="editor-minimap"
              imageUrl={image.url}
              alt={`Minimap of ${image.name}`}
              transformState={transformState}
              viewingBox={viewingBox}
              hasOpenPanel={hasOpenPanel}
            />
          )}
        </AnimatePresence>
        {/* Render the detection panel when on an image edit route and a detection is selected. */}
        <AnimatePresence>
          {isImageEditRoute && !isLoading && image && selectedDetectionId && (
            <DynamicEditorDetectionPanel
              key="editor-detection-panel"
              isMobile={isMobile}
              hasOpenPanel={hasOpenPanel}
            />
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
