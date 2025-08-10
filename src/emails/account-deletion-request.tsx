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

interface AccountDeletionRequestProps {
  token: string;
  deletionWindowDays?: number;
}

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Renders an email template for confirming an account deletion request.
 * @param token The unique token to authorize the deletion.
 * @param deletionWindowDays The number of days in the grace period. Defaults to a system-wide setting.
 * @returns A React component representing the email structure.
 */
export const AccountDeletionRequest = ({
  token,
  deletionWindowDays = DELETION_GRACE_PERIOD_DAYS,
}: AccountDeletionRequestProps) => {
  // Construct the full URL for the deletion confirmation API endpoint
  const deletionLink = `${domain}/api/delete-account?token=${token}`;
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
        <Preview>Action required to confirm the deletion of your MortiScope account.</Preview>
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
              Account Deletion Request
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              We received a request to delete your MortiScope account. To proceed, please confirm
              your decision by clicking the button below.
            </Text>

            {/* Conditionally render text based on whether a grace period exists */}
            {deletionWindowDays > 0 ? (
              <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
                Once you confirm by clicking the button below, your account will be scheduled for
                deletion. You will then have a{" "}
                <strong>{deletionWindowDays}-day grace period</strong> to cancel the deletion simply
                by logging back into your account.
              </Text>
            ) : (
              <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
                Once confirmed, your account and all associated data will be permanently and
                immediately deleted. This action cannot be undone.
              </Text>
            )}

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-rose-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={deletionLink}
              >
                Confirm Account Deletion
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If the button doesn&apos;t work, you can copy and paste this URL into your browser:{" "}
              <Link href={deletionLink} className="text-rose-500">
                {deletionLink}
              </Link>
            </Text>

            {/* Security notice for users who did not initiate the request */}
            <Text className="font-inter mt-4 text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If you did not request this, you can safely ignore this email. For your security, we
              recommend changing your password immediately.
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

export default AccountDeletionRequest;
