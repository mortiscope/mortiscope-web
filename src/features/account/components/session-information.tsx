import { memo } from "react";
import { GoGear, GoGlobe } from "react-icons/go";
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoLocationOutline } from "react-icons/io5";
import { PiDeviceTabletLight } from "react-icons/pi";

import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { getBrowserName, getCityProvince } from "@/features/account/utils/display-session";

interface SessionInformationProps {
  sessionItem: UserSessionInfo;
}

/**
 * Session information component that displays session details.
 * Shows browser, device, OS, location, and active status.
 */
export const SessionInformation = memo(({ sessionItem }: SessionInformationProps) => {
  return (
    <div className="flex-1 space-y-3">
      {/* Browser */}
      <div className="flex items-center gap-2">
        <GoGlobe className="h-4 w-4 text-emerald-600" />
        <span className="font-inter text-sm font-normal text-slate-800">
          {getBrowserName(sessionItem.browser)}
        </span>
      </div>

      {/* Device */}
      <div className="flex items-center gap-2">
        <PiDeviceTabletLight className="h-4 w-4 text-emerald-600" />
        <span className="font-inter text-sm font-normal text-slate-600">{sessionItem.device}</span>
      </div>

      {/* Operating System */}
      <div className="flex items-center gap-2">
        <GoGear className="h-4 w-4 text-emerald-600" />
        <span className="font-inter text-sm font-normal text-slate-600">
          {sessionItem.operatingSystem}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2">
        <IoLocationOutline className="h-4 w-4 text-emerald-600" />
        <span className="font-inter text-sm font-normal text-slate-600">
          {getCityProvince(sessionItem.location)}
        </span>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        {sessionItem.isActiveNow ? (
          <IoCheckmarkCircleOutline className="h-4 w-4 text-emerald-600" />
        ) : (
          <IoCloseCircleOutline className="h-4 w-4 text-emerald-600" />
        )}
        <span className="font-inter text-sm font-normal text-slate-600">
          {sessionItem.isActiveNow ? "Active now" : "Inactive"}
        </span>
      </div>
    </div>
  );
});

SessionInformation.displayName = "SessionInformation";
