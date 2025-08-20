"use client";

import { GoClock, GoGear, GoGlobe } from "react-icons/go";
import { IoCalendarClearOutline, IoLocationOutline } from "react-icons/io5";
import { PiDeviceTabletLight, PiMapPinSimpleAreaLight } from "react-icons/pi";

import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { formatDate, formatRelativeTime } from "@/features/account/utils/format-date";

/**
 * Props for the SessionDetailsList component.
 */
interface SessionDetailsListProps {
  /** The session information object to be displayed */
  session: UserSessionInfo;
}

/**
 * A component that renders a detailed list of session information
 * including browser, OS, device, location, IP address, and timestamps.
 */
export const SessionDetailsList = ({ session }: SessionDetailsListProps) => {
  return (
    <div className="space-y-4">
      {/* Browser */}
      <div className="flex items-center gap-3">
        <GoGlobe className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Browser:</span> {session.browser}
          </span>
        </div>
      </div>

      {/* Operating System */}
      <div className="flex items-center gap-3">
        <GoGear className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Operating System:</span>{" "}
            {session.operatingSystem}
          </span>
        </div>
      </div>

      {/* Device */}
      <div className="flex items-center gap-3">
        <PiDeviceTabletLight className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Device:</span> {session.device}
          </span>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-3">
        <IoLocationOutline className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Location:</span> {session.location}
          </span>
        </div>
      </div>

      {/* IP Address */}
      <div className="flex items-center gap-3">
        <PiMapPinSimpleAreaLight className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">IP Address:</span>{" "}
            <span className="font-mono">{session.ipAddress}</span>
          </span>
        </div>
      </div>

      {/* Date Added */}
      <div className="flex items-center gap-3">
        <IoCalendarClearOutline className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Date Added:</span>{" "}
            {formatDate(session.dateAdded)}
          </span>
        </div>
      </div>

      {/* Last Active */}
      <div className="flex items-center gap-3">
        <GoClock className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-inter text-sm text-slate-600">
            <span className="font-medium text-slate-700">Last Active:</span>{" "}
            {formatRelativeTime(session.lastActive)}
          </span>
        </div>
      </div>
    </div>
  );
};

SessionDetailsList.displayName = "SessionDetailsList";
