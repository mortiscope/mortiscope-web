import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, RenderOptions } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { ReactElement, ReactNode } from "react";

/**
 * A factory function to create a new query client instance specifically configured for tests.
 * The default options are set to create a more stable and predictable testing environment.
 *
 * @returns A new `QueryClient` instance for testing.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevents Tanstack Query from retrying failed requests during tests.
        retry: false,
        // Sets the garbage collection time to zero to ensure that data is not cached between tests.
        gcTime: 0,
      },
      mutations: {
        // Disables retries for mutations as well.
        retry: false,
      },
    },
  });
}

/**
 * Defines the props for the all the providers wrapper component.
 */
interface AllTheProvidersProps {
  children: ReactNode;
}

/**
 * A React component that serves as a single wrapper for all necessary context providers.
 *
 * @param {AllTheProvidersProps} props The component props, which include `children`.
 */
function AllTheProviders({ children }: AllTheProvidersProps) {
  // A new query client is created for each render to ensure tests are isolated.
  const testQueryClient = createTestQueryClient();

  return (
    <SessionProvider>
      <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}

/**
 * A custom render function that automatically wraps the provided interface in the all the providers component.
 * @param ui The React element to render.
 * @param options Additional `render` options from `@testing-library/react`, excluding the `wrapper` property.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export all named exports from `@testing-library/react`.
export * from "@testing-library/react";

// Export userEvent for simulating user interactions
export { default as userEvent } from "@testing-library/user-event";

// Export the custom `render` function but rename it to `render`.
export { customRender as render };
