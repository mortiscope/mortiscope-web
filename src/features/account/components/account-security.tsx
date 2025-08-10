"use client";

/**
 * The security tab content component for the account settings page.
 */
export const AccountSecurity = () => {
  return (
    <div className="w-full">
      {/* Security Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Security
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Change your password or enable extra security measures.
        </p>
      </div>
    </div>
  );
};

AccountSecurity.displayName = "AccountSecurity";
