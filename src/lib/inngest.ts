import { EventSchemas, Inngest } from "inngest";

/**
 * Defines the record of all events managed by Inngest.
 */
export type Events = {
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
