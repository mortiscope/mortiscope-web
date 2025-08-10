import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

import { DELETION_GRACE_PERIOD_DAYS } from "@/lib/constants";

interface AccountDeletionScheduledProps {
  deletionWindowDays?: number;
}

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Renders an email template notifying a user that their account deletion is scheduled.
 * @param deletionWindowDays The number of days in the grace period for account recovery.
 * @returns A React component representing the email structure.
 */
export const AccountDeletionScheduled = ({
  deletionWindowDays = DELETION_GRACE_PERIOD_DAYS,
}: AccountDeletionScheduledProps) => {
  // Define the link for the user to sign in and cancel the deletion process
  const recoveryLink = `${domain}/signin`;
  // Get the current year for the copyright notice
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Tailwind>
        <Head>
          <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <Font
            fontFamily="Inter"
            fallbackFontFamily="sans-serif"
            webFont={{
              url: "https://fonts.gstatic.com/s/inter/v19/UcC53FwrK3iLTcvneQg7B5iqpJlhKnPCkaL0UUMbm9wUkHXkEA.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <Font
            fontFamily="Plus Jakarta Sans"
            fallbackFontFamily="sans-serif"
            webFont={{
              url: "https://fonts.gstatic.com/s/plusjakartans/v11/LDIZaomQNQcsA88c7O9yZ4KMCoOg4KozySKCdSNG9OcqYQ37Di_aOKyYRw.woff2",
              format: "woff2",
            }}
            fontWeight={700}
            fontStyle="normal"
          />
        </Head>
        <Preview>
          This email confirms that your account is scheduled for permanent deletion and explains the
          recovery process.
        </Preview>
        <Body className="mx-auto my-auto bg-white font-sans">
          {/* Header section with a warning banner */}
          <Section
            className="h-[175px] w-full bg-rose-600"
            style={{
              backgroundImage: `url(${domain}/icons/pattern-skulls.svg)`,
              backgroundRepeat: "repeat",
            }}
          />

          {/* Main content container */}
          <Container className="mx-auto w-full max-w-[560px] p-8">
            <Section className="mt-4 text-center">
              <Img
                src={`${domain}/logos/logo.svg`}
                width="100"
                height="100"
                alt="MortiScope Logo"
                className="mx-auto my-0"
              />
            </Section>

            {/* Email heading and body text */}
            <Heading className="font-plus-jakarta-sans mt-4 mb-4 p-0 text-center text-2xl font-bold text-gray-800">
              Account Deletion Scheduled
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              This email confirms that your MortiScope account is now scheduled for permanent
              deletion.
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Your account and all associated data will be permanently erased in approximately{" "}
              <strong>{deletionWindowDays} days</strong>.
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If you change your mind, you can cancel this process at any time during the grace
              period. To recover your account, simply log in.
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-rose-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={recoveryLink}
              >
                Recover Account
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If the button doesn&apos;t work, you can go to our sign-in page directly:{" "}
              <Link href={recoveryLink} className="text-rose-500">
                {recoveryLink}
              </Link>
            </Text>

            {/* Footer section with copyright */}
            <Hr className="my-8 border-slate-300" />
            <Text className="font-inter text-center text-sm tracking-[0.015em] text-slate-600">
              Copyright © {currentYear} MortiScope.
            </Text>
          </Container>

          {/* Site title */}
          <Section className="mb-8 w-full text-center">
            <Img
              src={`${domain}/logos/site-title.svg`}
              width="175"
              height="25"
              alt="MortiScope"
              className="mx-auto my-0"
            />
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AccountDeletionScheduled;
