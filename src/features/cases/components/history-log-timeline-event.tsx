import { format, formatDistanceToNow } from "date-fns";
import { HiOutlineClipboardDocumentCheck } from "react-icons/hi2";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// A type alias for the data returned by our server action.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
type LogEntry = CaseHistoryData[number];

/**
 * A mapping of field names to human-readable labels.
 */
const fieldLabels: Record<string, string> = {
  caseName: "Case name",
  caseDate: "Case date and time",
  temperatureCelsius: "Ambient temperature",
  locationRegion: "Region",
  locationProvince: "Province",
  locationCity: "City",
  locationBarangay: "Barangay",
};

/**
 * Field display order that defines the priority order for displaying changes.
 */
const fieldOrder = [
  "caseName",
  "caseDate",
  "temperatureCelsius",
  "locationRegion",
  "locationProvince",
  "locationCity",
  "locationBarangay",
];

/**
 * Formats a value for display in the log, returning only the string or simple node.
 * @param value - The raw value from the log.
 * @param field - The field name, used for special formatting.
 * @returns A string or React node representing the formatted value.
 */
const formatValue = (value: unknown, field: string) => {
  if (value === null || value === undefined || value === "") {
    return <i className="text-slate-400">empty</i>;
  }
  if (field === "temperatureCelsius" && typeof value === "number") {
    return `${value.toFixed(2)} °C`;
  }
  if (field === "caseDate" && typeof value === "string") {
    return format(new Date(value), "MMM d, yyyy, h:mm a");
  }
  return String(value);
};

/**
 * Formats a single change log entry into a human-readable string with custom styling.
 * @param log - The log entry object.
 * @returns A React node representing the formatted change.
 */
const formatChange = (log: LogEntry) => {
  const fieldLabel = fieldLabels[log.field] ?? log.field;

  return (
    <div className="text-sm">
      <span className="text-slate-500">{fieldLabel}: </span>
      <span className="font-medium text-rose-600">{formatValue(log.oldValue, log.field)}</span>
      <span className="text-slate-400"> → </span>
      <span className="font-medium text-emerald-600">{formatValue(log.newValue, log.field)}</span>
    </div>
  );
};

interface HistoryLogTimelineEventProps {
  batchId: string;
  batchLogs: LogEntry[];
}

export const HistoryLogTimelineEvent = ({ batchId, batchLogs }: HistoryLogTimelineEventProps) => {
  const firstLog = batchLogs[0];
  if (!firstLog) return null;

  const user = firstLog.user;
  const timestamp = new Date(firstLog.timestamp);

  const sortedLogs = [...batchLogs].sort((a, b) => {
    const aIndex = fieldOrder.indexOf(a.field);
    const bIndex = fieldOrder.indexOf(b.field);
    // If field not in order array, put it at the end
    const aOrder = aIndex === -1 ? fieldOrder.length : aIndex;
    const bOrder = bIndex === -1 ? fieldOrder.length : bIndex;
    return aOrder - bOrder;
  });

  return (
    // Each event is a relative container with padding to make space for the icon.
    <div key={batchId} className="relative pl-12 md:pl-16">
      {/* The timeline event icon */}
      <div className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 md:h-10 md:w-10">
        <HiOutlineClipboardDocumentCheck className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{user?.name ?? "A user"}</span>
          &nbsp; made {batchLogs.length} change{batchLogs.length > 1 && "s"}.
        </p>
        <ul className="mt-2 space-y-2">
          {sortedLogs.map((log) => (
            <li key={log.id} className="text-sm">
              {formatChange(log)}
            </li>
          ))}
        </ul>
        <Tooltip>
          <TooltipTrigger asChild>
            <time className="mt-2 inline-block w-fit cursor-help text-xs text-slate-400">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </time>
          </TooltipTrigger>
          <TooltipContent>
            <p>{format(timestamp, "MMMM d, yyyy 'at' h:mm:ss a")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

HistoryLogTimelineEvent.displayName = "HistoryLogTimelineEvent";
