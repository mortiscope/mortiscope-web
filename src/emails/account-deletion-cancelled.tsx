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
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface AccountDeletionCancelledProps {
  username?: string | null;
}

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Renders an email template to confirm that a user's account deletion has been successfully cancelled.
 * @param username The user's display name for a personalized greeting.
 * @returns A React component representing the email structure.
 */
export const AccountDeletionCancelled = ({ username }: AccountDeletionCancelledProps) => {
  // Define link to the application's dashboard
  const dashboardLink = `${domain}/dashboard`;
  // Get the current year for the copyright notice
  const currentYear = new Date().getFullYear();
  // Create a personalized greeting with a fallback
  const displayName = username ? `, ${username}` : "there";

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
          This confirms the scheduled deletion for your MortiScope account has been cancelled.
        </Preview>
        <Body className="mx-auto my-auto bg-slate-200 font-sans">
          {/* Header section with a decorative banner */}
          <Section
            className="h-[175px] w-full bg-emerald-600"
            style={{
              backgroundImage: `url(${domain}/icons/pattern-temple.svg)`,
              backgroundRepeat: "repeat",
            }}
          />

          {/* Main content container */}
          <Container className="mx-auto -mt-16 mb-[40px] w-full max-w-[465px] rounded-none bg-slate-50 p-8 sm:rounded-2xl">
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
              Welcome Back!
            </Heading>

            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Hi <strong>{displayName}</strong>,
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              We&apos;re glad to see you again! Just to confirm, the scheduled deletion for your
              MortiScope account has been <strong> cancelled.</strong>
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Your account is safe and sound, and everything is just as you left it. Feel free to
              jump right back in.
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-emerald-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={dashboardLink}
              >
                Go to MortiScope
              </Button>
            </Section>

            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              For your security, please note that logging in is what automatically stopped the
              deletion. If this wasn&apos;t you, we strongly recommend changing your password from
              your account settings to keep your account secure.
            </Text>

            <Hr className="my-8 border-slate-300" />
            <Text className="font-inter text-center text-sm tracking-[0.015em] text-slate-600">
              Copyright © {currentYear} MortiScope.
            </Text>
          </Container>

          {/* Footer section with copyright */}
          <Section className="mt-8 mb-8 w-full text-center">
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

export default AccountDeletionCancelled;
