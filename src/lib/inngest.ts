import { EventSchemas, Inngest } from "inngest";

/**
 * Defines the record of all events managed by Inngest.
 */
type Events = {};

/**
 * The exported singleton Inngest client instance for the 'mortiscope' application.
 */
export const inngest = new Inngest({
  id: "mortiscope",
  schemas: new EventSchemas().fromRecord<Events>(),
});
