import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Constant containing mock upload record objects to simulate image files stored in cloud storage.
 */
export const mockUploads = {
  // Representation of the primary JPEG image upload associated with the first test case.
  firstUpload: {
    id: mockIds.firstUpload,
    key: `uploads/${mockIds.firstUser}/${mockIds.firstCase}/IMG-001-sample.jpg`,
    name: "IMG_001.JPG",
    url: `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/uploads/${mockIds.firstUser}/${mockIds.firstCase}/IMG-001-sample.jpg`,
    size: 3247589,
    type: "image/jpeg",
    width: 3984,
    height: 2656,
    userId: mockIds.firstUser,
    caseId: mockIds.firstCase,
    createdAt: new Date(mockDates.created),
  },
  // Representation of a secondary high-resolution image upload used to verify multi-file handling and aspect ratio logic.
  secondUpload: {
    id: mockIds.secondUpload,
    key: `uploads/${mockIds.firstUser}/${mockIds.firstCase}/IMG-002-sample.jpg`,
    name: "IMG_002.JPG",
    url: `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/uploads/${mockIds.firstUser}/${mockIds.firstCase}/IMG-002-sample.jpg`,
    size: 2856412,
    type: "image/jpeg",
    width: 4032,
    height: 3024,
    userId: mockIds.firstUser,
    caseId: mockIds.firstCase,
    createdAt: new Date(mockDates.created),
  },
};
