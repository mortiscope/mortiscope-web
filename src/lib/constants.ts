/**
 * The number of days after a deletion request before an account is permanently deleted.
 * @constant {number}
 */
export const DELETION_GRACE_PERIOD_DAYS = 30;

/**
 * A list of paths to deterministic SVG avatars used as fallbacks
 * @constant {object}
 */
export const DETERMINISTIC_AVATARS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
  "/avatars/avatar-7.svg",
  "/avatars/avatar-8.svg",
];

/**
 * Animation duration for the progress bar's line trace effect.
 * @constant {number}
 */
export const LINE_ANIMATION_DURATION = 0.8;

/**
 * Animation duration for the progress bar's circle "pop" effect.
 * @constant {number}
 */
export const CIRCLE_ANIMATION_DURATION = 0.4;

/**
 * The maximum number of files a user can upload.
 * @constant {number}
 */
export const MAX_FILES = 20;

/**
 * The maximum file size allowed for each individual file in bytes (10MB).
 * @constant {number}
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * An object defining the accepted image MIME types and their corresponding file extensions.
 * Used for file validation in react-dropzone.
 * @constant {object}
 */
export const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

/**
 * Defines the available aspect ratio options for the camera capture feature.
 * @constant {object[]}
 */
export const CAMERA_ASPECT_RATIOS = [
  { name: "Square", value: 1, className: "aspect-square" },
  { name: "Landscape", value: 16 / 9, className: "aspect-video" },
  { name: "Portrait", value: 9 / 16, className: "aspect-[9/16]" },
];

/**
 * The duration in seconds for which a pre-signed S3 URL is valid.
 * @constant {number}
 */
export const PRESIGNED_URL_EXPIRATION_SECONDS = 60 * 10;

/**
 * Defines the available sort options for the upload preview.
 * @constant {object[]}
 */
export const SORT_OPTIONS = [
  { value: "date-uploaded-desc", label: "Date Added (Newest)" },
  { value: "date-uploaded-asc", label: "Date Added (Oldest)" },
  { value: "date-modified-desc", label: "Date Created (Newest)" },
  { value: "date-modified-asc", label: "Date Created (Oldest)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "size-asc", label: "Size (Smallest)" },
  { value: "size-desc", label: "Size (Largest)" },
];

/**
 * Type alias for the sort option values.
 */
export type SortOptionValue = (typeof SORT_OPTIONS)[number]["value"];

/**
 * The maximum number of images to display in the large screen grid.
 * @constant {number}
 */
export const LG_GRID_LIMIT = 5;

/**
 * The maximum number of images to display in the medium screen grid.
 * @constant {number}
 */
export const MD_GRID_LIMIT = 4;

/**
 * The maximum number of images to display in the small screen grid.
 * @constant {number}
 */
export const SM_GRID_LIMIT = 2;

/**
 * Maximum number of history states to keep in memory for annotation undo/redo.
 * @constant {number}
 */
export const MAX_HISTORY = 50;

/**
 * A mapping of detection class names to their corresponding display colors.
 * This ensures consistent and configurable styling for bounding boxes.
 * @constant {Record<string, string>}
 */
export const DETECTION_CLASS_COLORS: Record<string, string> = {
  adult: "#14b8a6",
  pupa: "#f97316",
  instar_1: "#eab308",
  instar_2: "#84cc16",
  instar_3: "#22c55e",
  default: "#64748b",
};

/**
 * Defines the canonical order for detection classes for consistent display in charts and tables.
 * @constant {string[]}
 */
export const DETECTION_CLASS_ORDER = ["instar_1", "instar_2", "instar_3", "pupa", "adult"];

/**
 * Local storage key for storing user preference to hide the annotation save confirmation modal.
 * @constant {string}
 */
export const HIDE_SAVE_CONFIRMATION = "annotation-hide-save-confirmation";

/**
 * Defines all keyboard shortcuts for the annotation editor.
 * The `as const` assertion ensures the object is read-only for type safety.
 * @constant {object}
 */
export const KEYBOARD_SHORTCUTS = {
  // Editor header actions
  BACK_NAVIGATION: "q",
  PREVIOUS_IMAGE: "BracketLeft",
  NEXT_IMAGE: "BracketRight",
  TOGGLE_LOCK: "l",
  SAVE: "ctrl+s, meta+s",

  // Tool selection
  PAN_MODE: "h",
  SELECT_MODE: "v",
  DRAW_MODE: "d",

  // View controls for manipulating the canvas
  ZOOM_IN: "Equal, shift+Equal",
  ZOOM_OUT: "Minus",
  TOGGLE_MINIMAP: "m",
  CENTER_FOCUS: "0",
  RESET_VIEW: "ctrl+alt+0, meta+alt+0",

  // History management for undo/redo actions
  UNDO: "ctrl+z, meta+z",
  REDO: "ctrl+y, meta+y",
  RESET_CHANGES: "ctrl+shift+r, meta+shift+r",

  // Actions related to the currently selected detection
  DELETE_SELECTED: "delete, backspace",
  DESELECT: "escape",
} as const;
