import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Type representing the valid biological life stage labels for a detection.
 */
type DetectionLabel = "adult" | "instar_1" | "instar_2" | "instar_3" | "pupa";

/**
 * Type representing the lifecycle or verification status of a specific detection.
 */
type DetectionStatus =
  | "model_generated"
  | "user_verified"
  | "user_modified"
  | "user_created"
  | "user_deleted";

/**
 * Constant containing mock detection objects to simulate machine learning model outputs and user overrides.
 */
export const mockDetections = {
  // Representation of an adult specimen identified by the model with high confidence.
  adultDetection: {
    id: mockIds.firstDetection,
    uploadId: mockIds.firstUpload,
    label: "adult" as DetectionLabel,
    originalLabel: "adult" as DetectionLabel,
    confidence: 0.8308,
    originalConfidence: 0.8308,
    xMin: 2869,
    yMin: 1969,
    xMax: 2953,
    yMax: 2029,
    status: "model_generated" as DetectionStatus,
    createdById: mockIds.firstUser,
    lastModifiedById: null,
    createdAt: new Date(mockDates.created),
    updatedAt: new Date(mockDates.created),
    deletedAt: null,
  },
  // Representation of a first instar larva detected automatically by the system.
  firstInstarDetection: {
    id: mockIds.secondDetection,
    uploadId: mockIds.firstUpload,
    label: "instar_1" as DetectionLabel,
    originalLabel: "instar_1" as DetectionLabel,
    confidence: 0.7856,
    originalConfidence: 0.7856,
    xMin: 1200,
    yMin: 1500,
    xMax: 1230,
    yMax: 1525,
    status: "model_generated" as DetectionStatus,
    createdById: mockIds.firstUser,
    lastModifiedById: null,
    createdAt: new Date(mockDates.created),
    updatedAt: new Date(mockDates.created),
    deletedAt: null,
  },
  // Representation of a second instar larva used to verify coordinate-based rendering logic.
  secondInstarDetection: {
    id: mockIds.thirdDetection,
    uploadId: mockIds.firstUpload,
    label: "instar_2" as DetectionLabel,
    originalLabel: "instar_2" as DetectionLabel,
    confidence: 0.8274,
    originalConfidence: 0.8274,
    xMin: 2123,
    yMin: 2623,
    xMax: 2155,
    yMax: 2654,
    status: "model_generated" as DetectionStatus,
    createdById: mockIds.firstUser,
    lastModifiedById: null,
    createdAt: new Date(mockDates.created),
    updatedAt: new Date(mockDates.created),
    deletedAt: null,
  },
  // Representation of a third instar larva that has been manually confirmed by a user.
  thirdInstarDetection: {
    id: mockIds.fourthDetection,
    uploadId: mockIds.firstUpload,
    label: "instar_3" as DetectionLabel,
    originalLabel: "instar_3" as DetectionLabel,
    confidence: 0.7521,
    originalConfidence: 0.7521,
    xMin: 1636,
    yMin: 2470,
    xMax: 1670,
    yMax: 2492,
    status: "user_verified" as DetectionStatus,
    createdById: mockIds.firstUser,
    lastModifiedById: mockIds.firstUser,
    createdAt: new Date(mockDates.created),
    updatedAt: new Date(mockDates.updated),
    deletedAt: null,
  },
  // Representation of a pupa stage detection to ensure all lifecycle labels are handled in the UI.
  pupaDetection: {
    id: mockIds.fifthDetection,
    uploadId: mockIds.firstUpload,
    label: "pupa" as DetectionLabel,
    originalLabel: "pupa" as DetectionLabel,
    confidence: 0.9123,
    originalConfidence: 0.9123,
    xMin: 500,
    yMin: 500,
    xMax: 550,
    yMax: 580,
    status: "model_generated" as DetectionStatus,
    createdById: mockIds.firstUser,
    lastModifiedById: null,
    createdAt: new Date(mockDates.created),
    updatedAt: new Date(mockDates.created),
    deletedAt: null,
  },
};
