"use client";

/**
 * The deletion tab content component for the account settings page.
 */
export const AccountDeletion = () => {
  return (
    <div className="w-full">
      {/* Deletion Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Deletion
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Permanently delete your account and all of its associated data.
        </p>
      </div>
    </div>
  );
};

AccountDeletion.displayName = "AccountDeletion";
