import { EventSchemas, Inngest } from "inngest";

/**
 * Defines the record of all events managed by Inngest.
 */
export type Events = {
  /**
   * Fired when a user confirms account deletion via token.
   */
  "account/deletion.confirmed": {
    data: {
      token: string;
    };
  };

  /**
   * Fired at the exact time when a user's account should be permanently deleted.
   */
  "account/deletion.execute": {
    data: {
      userId: string;
    };
  };

  /**
   * Fired when a user successfully creates a new case.
   */
  "analysis/request.sent": {
    data: {
      caseId: string;
    };
  };

  /**
   * Fired when a user requests to export case data.
   */
  "export/case.data.requested": {
    data: {
      exportId: string;
      caseId: string;
      userId: string;
      format: "raw_data" | "pdf" | "labelled_images";
      resolution?: "1280x720" | "1920x1080" | "3840x2160";
    };
  };

  /**
   * Fired when a user requests to export a single image's data.
   */
  "export/image.data.requested": {
    data:
      | {
          exportId: string;
          uploadId: string;
          userId: string;
          format: "raw_data";
        }
      | {
          exportId: string;
          uploadId: string;
          userId: string;
          format: "labelled_images";
          resolution: "1280x720" | "1920x1080" | "3840x2160";
        };
  };

  /**
   * Fired when a user requests a PMI recalculation for a case.
   */
  "recalculation/case.requested": {
    data: {
      caseId: string;
    };
  };
};

/**
 * The exported singleton Inngest client instance for the 'mortiscope' application.
 */
export const inngest = new Inngest({
  id: "mortiscope",
  schemas: new EventSchemas().fromRecord<Events>(),
});
