"use client";

/**
 * The sessions tab content component for the account settings page.
 */
export const AccountSessions = () => {
  return (
    <div className="w-full">
      {/* Sessions Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Sessions
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Review all active logins on your devices and browsers.
        </p>
      </div>
    </div>
  );
};

AccountSessions.displayName = "AccountSessions";
