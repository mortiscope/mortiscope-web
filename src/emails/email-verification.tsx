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

interface EmailVerificationProps {
  token: string;
}

const domain = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Renders the email template for user email address verification.
 * @param token The unique token used to construct the verification link.
 * @returns A React component representing the email structure.
 */
export const EmailVerification = ({ token }: EmailVerificationProps) => {
  // Construct the full verification URL from the domain and token
  const verificationLink = `${domain}/verification?token=${token}`;
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
              url: "https://fonts.gstatic.com/s/plusjakartasans/v11/LDIZaomQNQcsA88c7O9yZ4KMCoOg4KozySKCdSNG9OcqYQ37Di_aOKyYRw.woff2",
              format: "woff2",
            }}
            fontWeight={700}
            fontStyle="normal"
          />
        </Head>
        <Preview>
          Verify this email address as the final step to activate your MortiScope account.
        </Preview>
        <Body className="mx-auto my-auto bg-slate-200 font-sans">
          {/* Header section with a decorative banner */}
          <Section
            className="h-[175px] w-full bg-emerald-600"
            style={{
              backgroundImage: `url(${domain}/icons/temple.svg)`,
              backgroundRepeat: "repeat",
            }}
          />

          {/* Main content container */}
          <Container className="mx-auto -mt-16 mb-[40px] w-full max-w-[465px] rounded-none bg-slate-50 p-8 sm:rounded-2xl">
            <Section className="mt-4 text-center">
              {/* Logo section */}
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
              Confirm Email Address
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Thank you for signing up to MortiScope. Click the button below to complete your
              registration and verify your email.
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-emerald-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={verificationLink}
              >
                Verify Email
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If it didn&apos;t work, you can copy and paste this URL into your browser:&nbsp;
              <Link href={verificationLink} className="text-emerald-500">
                {verificationLink}
              </Link>
            </Text>

            {/* Security information notice */}
            <Text className="font-inter mt-4 text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              This link is valid for the next 24 hours. If you did not sign up for a MortiScope
              account, you can safely ignore this email.
            </Text>

            {/* Footer section with copyright */}
            <Hr className="my-8 border-slate-300" />
            <Text className="font-inter text-center text-sm tracking-[0.015em] text-slate-600">
              Copyright © {currentYear} MortiScope.
            </Text>
          </Container>

          {/* Site title */}
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

export default EmailVerification;
