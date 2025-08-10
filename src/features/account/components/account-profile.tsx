"use client";

/**
 * The profile tab content component for the account settings page.
 */
export const AccountProfile = () => {
  return (
    <div className="w-full">
      {/* Profile Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Profile
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          View and manage your personal information.
        </p>
      </div>
    </div>
  );
};

AccountProfile.displayName = "AccountProfile";
