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
   * Fired when a user successfully updates their email address.
   */
  "account/email.updated": {
    data: {
      userId: string;
      oldEmail: string;
      newEmail: string;
      userName: string | null;
    };
  };

  /**
   * Fired when a user successfully updates their password.
   */
  "account/password.updated": {
    data: {
      userId: string;
      userEmail: string;
      userName: string | null;
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
    data:
      | {
          exportId: string;
          caseId: string;
          userId: string;
          format: "raw_data";
          passwordProtection?: {
            enabled: boolean;
            password?: string;
          };
        }
      | {
          exportId: string;
          caseId: string;
          userId: string;
          format: "labelled_images";
          resolution: "1280x720" | "1920x1080" | "3840x2160";
          passwordProtection?: {
            enabled: boolean;
            password?: string;
          };
        }
      | {
          exportId: string;
          caseId: string;
          userId: string;
          format: "pdf";
          pageSize: "a4" | "letter";
          securityLevel: "standard" | "view_protected" | "permissions_protected";
          password?: string;
          permissions?: {
            printing: boolean;
            copying: boolean;
            annotations: boolean;
            formFilling: boolean;
            assembly: boolean;
            extraction: boolean;
            pageRotation: boolean;
            degradedPrinting: boolean;
            screenReader: boolean;
            metadataModification: boolean;
          };
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
          passwordProtection?: {
            enabled: boolean;
            password?: string;
          };
        }
      | {
          exportId: string;
          uploadId: string;
          userId: string;
          format: "labelled_images";
          resolution: "1280x720" | "1920x1080" | "3840x2160";
          passwordProtection?: {
            enabled: boolean;
            password?: string;
          };
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
