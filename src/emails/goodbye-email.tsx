import {
  Body,
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

interface GoodbyeEmailProps {
  username?: string | null;
}

const domain = process.env.NEXT_PUBLIC_APP_URL;

// Define reusable background color variable for the gradient effect
const bodyBgColor = "#f9fafb";

/**
 * Renders a farewell email to a user after their account has been permanently deleted.
 * @param username The user's display name for a personalized message.
 * @returns A React component representing the email structure.
 */
export const GoodbyeEmail = ({ username }: GoodbyeEmailProps) => {
  // Get the current year for the copyright notice
  const currentYear = new Date().getFullYear();
  // Create a personalized greeting with a fallback
  const displayName = username || "there";

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
        <Preview>
          This is the final confirmation that your MortiScope account and all associated data have
          been permanently deleted.
        </Preview>
        <Body className="mx-auto my-auto bg-gray-50 font-sans">
          {/* Header section with a decorative banner */}
          <Section
            style={{
              backgroundImage: `linear-gradient(to bottom, transparent 10%, ${bodyBgColor} 100%), url(${domain}/images/goodbye-banner.jpg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              height: "225px",
              width: "100%",
            }}
          />

          {/* Main content container */}
          <Container className="mx-auto -mt-4 mb-[40px] w-full max-w-[560px] rounded-none p-8 sm:rounded-2xl">
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
              Account Deleted
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Hello <strong>{displayName}</strong>,
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              This email is to confirm that your MortiScope account and all associated data have
              been permanently deleted from our systems as you requested. This action is
              irreversible, and your data cannot be recovered anymore.
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              We&apos;re sorry to see you go, but we thank you for the time you spent with our web
              application. We hope <strong>MortiScope</strong> became a useful tool for your work
              during that run. If you have any feedback you&apos;d like to share, we&apos;d still
              like to hear it.
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If you ever change your mind, you are always welcome to create a new account in the
              future. Still, special thanks and appreciation by the creators for being a part of
              this journey.
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

export default GoodbyeEmail;
