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

interface EmailUpdatedProps {
  /** Determines if the email is a security alert ('old') or a success confirmation ('new'). */
  notificationType: "old" | "new";
}

const domain = process.env.NEXT_PUBLIC_APP_URL;
const contactEmail = process.env.CONTACT_EMAIL;

/**
 * Renders an email template to notify users that their account's email address has been updated.
 * The content is dynamically adjusted based on whether the recipient is the old or new email address.
 * @param notificationType Specifies the context of the notification ('old' for security alert, 'new' for confirmation).
 * @returns A React component representing the email structure.
 */
export const EmailUpdated = ({ notificationType }: EmailUpdatedProps) => {
  // Determine if this is a security alert for the old email address
  const isSecurityAlert = notificationType === "old";
  // Define the link for the user to sign in
  const signinLink = `${domain}/signin`;
  // Get the current year for the copyright notice
  const currentYear = new Date().getFullYear();

  // Dynamically set the email's preview text based on the notification type
  const previewText = isSecurityAlert
    ? "A security alert regarding a recent change to the email address on your MortiScope account."
    : "Confirmation that your MortiScope account email has been successfully updated to this address.";

  // Dynamically set the main heading
  const headingText = isSecurityAlert ? "Email Address Changed" : "Email Address Updated";

  const bodyText = isSecurityAlert
    ? "This is a notification that the email address associated with your MortiScope account was recently changed. You will no longer be able to use this email to sign in."
    : "This email confirms that the email address for your MortiScope account has been successfully changed. You must use this new email address for all future sign-ins.";

  // Dynamically set the security warning message
  const securityWarning = isSecurityAlert
    ? `If you did not authorize this change, your account has been compromised. Please contact our support team immediately at`
    : `If you did not initiate this change, please secure your account immediately by resetting your password and contact us at`;

  return (
    <Html>
      <Tailwind>
        <Head>
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
        <Preview>{previewText}</Preview>
        <Body className="mx-auto my-auto bg-white font-sans">
          {/* Header section with a decorative banner */}
          <Section
            className="h-[175px] w-full bg-emerald-600"
            style={{
              backgroundImage: `url(${domain}/icons/pattern-temple.svg)`,
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
              {headingText}
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              {bodyText}
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-emerald-500 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={signinLink}
              >
                Sign In
              </Button>
            </Section>

            {/* Dynamic security warning */}
            <Text className="font-inter mt-4 text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              {securityWarning}
              {contactEmail ? (
                <>
                  {" "}
                  <Link href={`mailto:${contactEmail}`} className="text-emerald-500">
                    {contactEmail}
                  </Link>
                  .
                </>
              ) : (
                " our support channels."
              )}
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

export default EmailUpdated;
