"use client";

import { SessionProvider } from "next-auth/react";

type Props = {
  children: React.ReactNode;
};

/**
 * A client component that wraps its children with the `SessionProvider` from `next-auth/react`
 *
 * @param {Props} props The component props, containing the children to be rendered.
 * @returns The children nodes wrapped within the SessionProvider.
 */
export const NextAuthSessionProvider = ({ children }: Props) => {
  return <SessionProvider>{children}</SessionProvider>;
};
