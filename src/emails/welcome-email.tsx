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

interface WelcomeEmailProps {
  username?: string | null;
}

const domain = process.env.NEXT_PUBLIC_APP_URL;

// Define reusable background color variable for the gradient effect
const bodyBgColor = "#f9fafb";

/**
 * Renders a welcome email for new users who have successfully verified their account.
 * @param username The user's display name for a personalized greeting.
 * @returns A React component representing the email structure.
 */
export const WelcomeEmail = ({ username }: WelcomeEmailProps) => {
  // Define link to the application's dashboard
  const buttonLink = `${domain}/dashboard`;
  // Render the contact email for correspondence
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
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
        <Preview>Welcome to MortiScope! Your account is now active and ready to be used.</Preview>
        <Body className="mx-auto my-auto bg-gray-50 font-sans">
          {/* Header section with a decorative banner */}
          <Section
            style={{
              backgroundImage: `linear-gradient(to bottom, transparent 10%, ${bodyBgColor} 100%), url(${domain}/images/welcome-banner.jpg)`,
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
              Welcome to MortiScope!
            </Heading>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Hello <strong className="text-gray-900">{displayName}</strong>,
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Your email has been successfully verified. We&apos;re thrilled to have you on board!
              You can now be able to identify{" "}
              <em className="text-gray-900">Chrysomya megacephala</em>, classify its life stages,
              and estimate Post-Mortem Interval (PMI).
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              <strong className="text-gray-900">MortiScope</strong> was developed by two hardworking
              and dedicated Computer Science students as part of their undergraduate thesis. Lots of
              time, energy, and efforts have been poured into this, so we sincerely appreciate you
              taking the time to use our web application.
            </Text>
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              To get started, head over to the web application to begin your first analysis.
            </Text>

            {/* Call-to-action button */}
            <Section className="mt-8 mb-8 text-center">
              <Button
                className="font-inter w-full cursor-pointer rounded-lg bg-emerald-600 py-3 text-center text-sm font-medium tracking-[0.025em] text-white no-underline"
                href={buttonLink}
              >
                Get Started
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              If the button above doesn&apos;t work, you can copy and paste this link into your
              browser:{" "}
              <Link href={buttonLink} className="text-emerald-600">
                {buttonLink}
              </Link>
            </Text>

            {/* Contact and support information. */}
            <Text className="font-inter text-[14px] leading-[24px] tracking-[0.015em] text-gray-800">
              Should you have any questions, suggestions, or require assistance, please feel free to
              reach out to us
              {contactEmail ? (
                <>
                  {" at "}
                  <Link href={`mailto:${contactEmail}`} className="text-emerald-500">
                    {contactEmail}
                  </Link>
                </>
              ) : (
                " via this email."
              )}
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

export default WelcomeEmail;
