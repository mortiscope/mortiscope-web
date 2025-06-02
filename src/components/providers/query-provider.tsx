"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * A client component that provides the TanStack Query context to its children.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use useState to create the QueryClient instance.
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
