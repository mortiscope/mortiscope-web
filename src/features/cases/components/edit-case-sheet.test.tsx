import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Control,
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
  UseFormStateReturn,
} from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { EditCaseSheet } from "@/features/cases/components/edit-case-sheet";
import { useEditCaseForm } from "@/features/cases/hooks/use-edit-case-form";
import { getCaseHistory } from "@/features/results/actions/get-case-history";
import { type CaseWithRelations } from "@/features/results/components/results-view";

// Interface for props expected by the mocked tab component.
interface TabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Interface for props used by the mock Controller component.
interface ControllerMockProps {
  render: (props: {
    field: ControllerRenderProps<FieldValues, string>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<FieldValues>;
  }) => React.ReactElement;
  name: string;
  defaultValue?: unknown;
}

// Mock the custom hook that manages the form state and business logic for editing a case.
vi.mock("@/features/cases/hooks/use-edit-case-form");

// Mock the `react-hook-form` Controller to allow testing of components that rely on it, simulating field state.
vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    Controller: ({ render, name, defaultValue }: ControllerMockProps) => (
      <>
        {render({
          field: {
            name,
            value: defaultValue,
            onChange: vi.fn(),
            onBlur: vi.fn(),
            ref: vi.fn(),
            disabled: false,
          },
          fieldState: {
            invalid: false,
            isTouched: false,
            isDirty: false,
            error: undefined,
            isValidating: false,
          },
          formState: {} as UseFormStateReturn<FieldValues>,
        })}
      </>
    ),
  };
});

// Mock react-query hooks to control data fetching behavior.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

// Mock environment variables and database/auth dependencies.
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the server action for fetching case history.
vi.mock("@/features/results/actions/get-case-history", () => ({
  getCaseHistory: vi.fn(),
}));

// Mock the Radix Dialog/Sheet primitives to isolate the modal functionality.
vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet-root">{children}</div> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Overlay: () => <div data-testid="sheet-overlay" />,
  Content: ({
    children,
    className,
    onOpenAutoFocus,
  }: {
    children: React.ReactNode;
    className?: string;
    onOpenAutoFocus?: (e: Event) => void;
  }) => (
    <div
      className={className}
      data-testid="sheet-content"
      onFocus={(e) => onOpenAutoFocus?.(e.nativeEvent)}
      tabIndex={-1}
    >
      {children}
    </div>
  ),
}));

// Mock `framer-motion` components.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock tab content components.
vi.mock("@/features/cases/components/case-note-editor", () => ({
  CaseNoteEditor: () => <div data-testid="mock-case-note-editor" />,
}));
vi.mock("@/features/cases/components/case-history-log", () => ({
  CaseHistoryLog: () => <div data-testid="mock-case-history-log" />,
}));

// Mock dynamic imports.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<React.ComponentType<unknown>> | React.ComponentType<unknown>,
    options?: { loading?: () => React.ReactNode }
  ) => {
    if (typeof loader === "function") {
      // Execute the loader to trigger the dynamic import for coverage
      void (loader as () => Promise<unknown>)();
    }
    if (options?.loading) options.loading();

    // Return a mock component for dynamically loaded components.
    return function MockDynamicComponent(props: Record<string, unknown>) {
      return <div data-testid="mock-dynamic-component" data-props={JSON.stringify(props)} />;
    };
  },
}));

// Mock sheet structural components (Header, Tabs, Footer).
vi.mock("@/features/results/components/edit-case-sheet-header", () => ({
  EditCaseSheetHeader: () => <div data-testid="sheet-header" />,
}));

vi.mock("@/features/cases/components/edit-case-tabs", () => ({
  EditCaseTabs: ({ activeTab, onTabChange }: TabProps) => (
    <div data-testid="sheet-tabs">
      <button onClick={() => onTabChange("details")}>Details Tab</button>
      <button onClick={() => onTabChange("notes")}>Notes Tab</button>
      <button onClick={() => onTabChange("history")}>History Tab</button>
      <span>Active: {activeTab}</span>
    </div>
  ),
}));

vi.mock("@/features/results/components/edit-case-sheet-footer", () => ({
  EditCaseSheetFooter: () => (
    <div data-testid="sheet-footer">
      <button type="submit">Save Changes</button>
    </div>
  ),
}));

// Mock the details form component.
vi.mock("@/features/cases/components/edit-case-form", () => ({
  EditCaseForm: () => <div data-testid="edit-case-form">Form Content</div>,
}));

// Mock the loading spinner component.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="beat-loader" />,
}));

// Mock case data for testing.
const mockCaseData = {
  id: "case-123",
  caseName: "Test Case",
  recalculationNeeded: false,
} as unknown as CaseWithRelations;

// Default mock values returned by the `useEditCaseForm` hook.
const defaultHookValues = {
  form: {
    control: {} as Control<FieldValues>,
    handleSubmit: (fn: () => void) => (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault();
      fn();
    },
  },
  activeTab: "details",
  setActiveTab: vi.fn(),
  lockedFields: {},
  toggleLock: vi.fn(),
  addressData: {
    isLoading: false,
    regionList: [],
    provinceList: [],
    cityList: [],
    barangayList: [],
  },
  onSubmit: vi.fn(),
  isButtonDisabled: false,
  isSubmitting: false,
};

/**
 * Test suite for the `EditCaseSheet` component.
 */
describe("EditCaseSheet", () => {
  beforeEach(() => {
    // Arrange: Reset mocks and set default hook return values.
    vi.mocked(useEditCaseForm).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useEditCaseForm>
    );

    // Arrange: Set default return values for the `useQuery` hook.
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQuery>);
  });

  /**
   * Test case to verify that nothing is rendered when `isOpen` is false.
   */
  it("renders nothing when isOpen is false", () => {
    // Arrange: Render the component with `isOpen` set to false.
    render(<EditCaseSheet caseData={mockCaseData} isOpen={false} onOpenChange={vi.fn()} />);
    // Assert: Check that the mocked sheet root element is not in the document.
    expect(screen.queryByTestId("sheet-root")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the main structural components of the sheet (content, header, tabs, footer) are rendered when `isOpen` is true.
   */
  it("renders the sheet structure when isOpen is true", () => {
    // Arrange: Render the component with `isOpen` set to true.
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for the presence of the core sheet elements.
    expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-header")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-footer")).toBeInTheDocument();
  });

  /**
   * Test suite for conditional rendering of content based on the active tab state.
   */
  describe("Tab Content Rendering", () => {
    /**
     * Test case to verify that the `EditCaseForm` (Details tab content) is rendered when `activeTab` is "details".
     */
    it("renders Details Form by default (activeTab='details')", () => {
      // Arrange: Render the component (default hook state is "details").
      render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

      // Assert: Check for the presence of the mock edit case form.
      expect(screen.getByTestId("edit-case-form")).toBeInTheDocument();
    });

    /**
     * Test case to verify that a loading spinner is shown instead of the form content if the address data lists are still being fetched.
     */
    it("renders loading spinner if addressData is loading on Details tab", () => {
      // Arrange: Mock the hook to indicate that address data is loading.
      vi.mocked(useEditCaseForm).mockReturnValue({
        ...defaultHookValues,
        addressData: { ...defaultHookValues.addressData, isLoading: true },
      } as unknown as ReturnType<typeof useEditCaseForm>);

      // Arrange: Render the component.
      render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

      // Assert: Check for the presence of the mock loading spinner.
      expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
      // Assert: Check that the form content is not rendered.
      expect(screen.queryByTestId("edit-case-form")).not.toBeInTheDocument();
    });

    /**
     * Test case to verify that the Notes Editor component is rendered when `activeTab` is "notes".
     */
    it("renders Notes Editor when activeTab is 'notes'", () => {
      // Arrange: Mock the hook to set the active tab to "notes".
      vi.mocked(useEditCaseForm).mockReturnValue({
        ...defaultHookValues,
        activeTab: "notes",
      } as unknown as ReturnType<typeof useEditCaseForm>);

      // Arrange: Render the component.
      render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

      // Assert: Check for the presence of the mock dynamic component for the Notes Editor.
      expect(screen.getByTestId("mock-dynamic-component")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the History Log component is rendered and that the required history data fetching query is initiated when `activeTab` is "history".
     */
    it("renders History Log and fetches data when activeTab is 'history'", () => {
      // Arrange: Mock the hook to set the active tab to "history".
      vi.mocked(useEditCaseForm).mockReturnValue({
        ...defaultHookValues,
        activeTab: "history",
      } as unknown as ReturnType<typeof useEditCaseForm>);

      // Arrange: Render the component.
      render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

      // Assert: Check that `useQuery` was called with the correct query key and enabled status.
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["caseHistory", "case-123"],
          enabled: true,
        })
      );

      // Assert: Check for the presence of the mock dynamic component for the History Log.
      expect(screen.getAllByTestId("mock-dynamic-component").length).toBeGreaterThan(0);
    });
  });

  /**
   * Test case to verify that clicking a tab in the sheet triggers the `setActiveTab` state function from the hook.
   */
  it("handles tab switching via setActiveTab", async () => {
    // Arrange: Define a spy for `setActiveTab`.
    const setActiveTabMock = vi.fn();
    vi.mocked(useEditCaseForm).mockReturnValue({
      ...defaultHookValues,
      setActiveTab: setActiveTabMock,
    } as unknown as ReturnType<typeof useEditCaseForm>);

    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock "Notes Tab" button.
    await user.click(screen.getByText("Notes Tab"));

    // Assert: Check that the mock function was called with the value of the clicked tab.
    expect(setActiveTabMock).toHaveBeenCalledWith("notes");
  });

  /**
   * Test case to verify that clicking the "Save Changes" button in the footer triggers the form's submit handler from the hook.
   */
  it("submits the form when footer save button is clicked", async () => {
    // Arrange: Define a spy for the `onSubmit` function.
    const onSubmitMock = vi.fn();
    vi.mocked(useEditCaseForm).mockReturnValue({
      ...defaultHookValues,
      onSubmit: onSubmitMock,
    } as unknown as ReturnType<typeof useEditCaseForm>);

    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock submit button in the footer.
    await user.click(screen.getByText("Save Changes"));

    // Assert: Check that the mock `onSubmit` function was called.
    expect(onSubmitMock).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the history query polls more frequently when the case requires recalculation.
   */
  it("polls history more frequently if recalculation is needed", () => {
    // Arrange: Mock the hook to set the active tab to "history".
    vi.mocked(useEditCaseForm).mockReturnValue({
      ...defaultHookValues,
      activeTab: "history",
    } as unknown as ReturnType<typeof useEditCaseForm>);

    // Arrange: Modify case data to indicate recalculation is needed.
    const recalcCaseData = { ...mockCaseData, recalculationNeeded: true };

    // Arrange: Render the component.
    render(<EditCaseSheet caseData={recalcCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check that `useQuery` was called with a `refetchInterval` of 5000ms.
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 5000,
      })
    );
  });

  /**
   * Test case to verify the focus handling for the sheet content.
   */
  it("handles onOpenAutoFocus event", () => {
    // Arrange: Render the component.
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Manually trigger focus on the sheet content element.
    const content = screen.getByTestId("sheet-content");
    content.focus();
    // Assert: No crash should occur, indicating the focus logic is handled gracefully.
  });

  /**
   * Test case to verify that the query function for fetching history data correctly calls the server action.
   */
  it("executes the queryFn when fetching history", async () => {
    // Arrange: Mock the hook to set the active tab to "history".
    vi.mocked(useEditCaseForm).mockReturnValue({
      ...defaultHookValues,
      activeTab: "history",
    } as unknown as ReturnType<typeof useEditCaseForm>);

    // Arrange: Render the component.
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Find the `queryFn` passed to `useQuery` for history fetching.
    const calls = vi.mocked(useQuery).mock.calls;
    const historyCall = calls.find(
      (args) => Array.isArray(args[0].queryKey) && args[0].queryKey[0] === "caseHistory"
    );

    // Act: Manually execute the query function if found.
    if (historyCall && typeof historyCall[0].queryFn === "function") {
      await (historyCall[0].queryFn as () => Promise<unknown>)();
    }

    // Assert: Check that the underlying server action was called with the correct `caseId`.
    expect(getCaseHistory).toHaveBeenCalledWith(mockCaseData.id);
  });

  /**
   * Test case to verify that the sheet triggers the `onOpenChange(false)` prop when the sheet closing logic is executed.
   */
  it("calls onOpenChange(false) when onSheetClose is triggered", () => {
    // Arrange: Define a spy for the `onOpenChange` prop.
    const onOpenChangeMock = vi.fn();
    render(<EditCaseSheet caseData={mockCaseData} isOpen={true} onOpenChange={onOpenChangeMock} />);

    // Act: Find the `onSheetClose` function passed to `useEditCaseForm` and execute it.
    const calls = vi.mocked(useEditCaseForm).mock.calls;
    const latestCall = calls[calls.length - 1];
    const props = latestCall[0];

    if (props && typeof props.onSheetClose === "function") {
      props.onSheetClose();
    }

    // Assert: Check that the mock `onOpenChange` function was called with `false`.
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
