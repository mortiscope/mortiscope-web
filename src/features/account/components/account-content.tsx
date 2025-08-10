import { AccountDeletion } from "@/features/account/components/account-deletion";
import { AccountProfile } from "@/features/account/components/account-profile";
import { AccountSecurity } from "@/features/account/components/account-security";
import { AccountSessions } from "@/features/account/components/account-sessions";

/**
 * Defines the props for the account content component.
 */
interface AccountContentProps {
  /** The currently active tab's value. */
  activeTab: string;
}

/**
 * The content display component for the account settings page.
 * It renders the forms and information corresponding to the selected tab.
 */
export const AccountContent = ({ activeTab }: AccountContentProps) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <AccountProfile />;
      case "security":
        return <AccountSecurity />;
      case "sessions":
        return <AccountSessions />;
      case "deletion":
        return <AccountDeletion />;
      default:
        return null;
    }
  };

  return <div className="w-full">{renderTabContent()}</div>;
};

AccountContent.displayName = "AccountContent";
