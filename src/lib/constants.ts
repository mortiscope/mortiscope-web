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
