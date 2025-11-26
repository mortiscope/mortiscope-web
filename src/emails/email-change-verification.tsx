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

interface EmailChangeVerificationProps {
  token: string;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? "")
    : "http://localhost:3000";

/**
 * Renders an email template for verifying a new email address for a user's account.
 * @param token The unique token used to construct the verification link.
 * @returns A React component representing the email structure.
 */
export const EmailChangeVerification = ({
  token = "preview-token",
}: EmailChangeVerificationProps) => {
  // Construct the full verification URL, including a type parameter to differentiate it
  const verificationLink = `${baseUrl}/verification?token=${token}&type=email-change`;
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
        <Preview>A final step is required to update the email for your MortiScope account.</Preview>
        <Body className="mx-auto my-auto bg-white font-sans">
          {/* Header section with a decorative banner */}
          <Section
            className="h-[175px] w-full bg-emerald-600"
            style={{
              backgroundImage: `url(${baseUrl}/static/pattern-temple.png)`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px 128px",
            }}
          />

          {/* Main content container */}
          <Container className="mx-auto w-full max-w-[560px] p-8">
            <Section className="mt-4 text-center">
              <Img
                src={`${baseUrl}/static/logo.png`}
                width="100"
                height="100"
                alt="MortiScope Logo"
                className="mx-auto my-0"
              />
            </Section>

            {/* Email heading and body text */}
            <Heading className="font-plus-jakarta-sans mt-4 mb-4 p-0 text-center text-2xl font-bold text-gray-800">
              Confirm New Email
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Please click the button below to confirm this address as the new primary email for
              your MortiScope account.
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-emerald-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={verificationLink}
              >
                Confirm New Email
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If it didn&apos;t work, you can copy and paste this URL into your browser:{" "}
              <Link href={verificationLink} className="text-emerald-500">
                {verificationLink}
              </Link>
            </Text>

            {/* Security notice for users who did not initiate the request */}
            <Text className="font-inter mt-4 text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If you did not request this change, you can safely ignore this email. A security alert
              has been sent to your previous address.
            </Text>

            {/* Footer section with copyright */}
            <Hr className="my-8 border-slate-300" />
            <Text className="font-inter text-center text-sm tracking-[0.015em] text-slate-600">
              Copyright © {currentYear} — MortiScope.
            </Text>
          </Container>

          {/* Site title */}
          <Section className="mb-8 w-full text-center">
            <Img
              src={`${baseUrl}/static/site-title.png`}
              width="200"
              alt="MortiScope"
              className="mx-auto my-0"
            />
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailChangeVerification;
