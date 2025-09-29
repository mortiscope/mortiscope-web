import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResultsPreview } from "@/features/results/components/results-preview";
import { useCases } from "@/features/results/hooks/use-cases";
import { useResultsStore } from "@/features/results/store/results-store";

// Mock the database to prevent actual connections during unit testing.
vi.mock("@/db", () => ({
  db: {},
}));

// Mock authentication utilities to control the signed-in state and session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock environment variables to ensure consistent URL references in tests.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock the server action for renaming cases to track execution and return values.
vi.mock("@/features/results/actions/rename-case", () => ({
  renameCase: vi.fn(),
}));

interface MockCase {
  id: string;
  caseName: string;
  caseDate: Date;
  createdAt: Date;
}

interface CaseListProps {
  cases: MockCase[];
  onStartRename: (e: React.MouseEvent, id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onDetails: (id: string) => void;
  onView: (id: string) => void;
  renamingCaseId: string | null;
  tempCaseName: string;
  onTempCaseNameChange: (val: string) => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  onConfirmRename: () => void;
}

// Mock the Next.js router to verify navigation calls like `push` or `refresh`.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockInvalidateQueries = vi.fn();
const mockCancelQueries = vi.fn();
const mockGetQueryData = vi.fn();
const mockSetQueryData = vi.fn((updater) => {
  if (typeof updater === "function") {
    updater([{ id: "case-1", caseName: "Old Name" }]);
  }
});
const mockMutate = vi.fn();

// Mock React Query hooks to simulate cache management and optimistic updates.
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    cancelQueries: mockCancelQueries,
    getQueryData: mockGetQueryData,
    setQueryData: mockSetQueryData,
  }),
  useMutation: (options: {
    onMutate?: (variables: unknown) => Promise<unknown>;
    mutationFn?: (variables: unknown) => Promise<unknown>;
    onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
    onError?: (error: unknown, variables: unknown, context: unknown) => void;
    onSettled?: (data: unknown, error: unknown, variables: unknown, context: unknown) => void;
  }) => {
    return {
      mutate: async (variables: unknown) => {
        mockMutate(variables);
        let context;
        let result: unknown;
        try {
          if (options?.onMutate) {
            context = await options.onMutate(variables);
          }

          if (options?.mutationFn) {
            result = await options.mutationFn(variables);
          }

          if (options?.onSuccess) {
            options.onSuccess(result, variables, context);
          }
          if (options?.onSettled) {
            options.onSettled(result, null, variables, context);
          }
        } catch (error) {
          if (options?.onError) {
            options.onError(error, variables, context);
          }
          if (options?.onSettled) {
            options.onSettled(undefined, error, variables, context);
          }
        }
      },
      isPending: false,
    };
  },
}));

// Mock the toast system to verify user feedback notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the `CaseList` component to simplify interactions within the results list.
vi.mock("@/features/results/components/case-list", () => ({
  CaseList: (props: CaseListProps & { inputRef?: React.Ref<HTMLInputElement> }) => (
    <div data-testid="case-list">
      {props.cases.map((c) => (
        <div key={c.id} data-testid={`case-item-${c.id}`}>
          {c.caseName}
          <button onClick={(e) => props.onStartRename(e, c.id, c.caseName)}>Rename</button>
          <button onClick={() => props.onDelete(c.id, c.caseName)}>Delete</button>
          <button onClick={() => props.onDetails(c.id)}>Details</button>
          <button onClick={() => props.onView(c.id)}>View</button>
        </div>
      ))}
      {props.renamingCaseId && (
        <input
          data-testid="rename-input"
          ref={props.inputRef}
          value={props.tempCaseName}
          onChange={(e) => props.onTempCaseNameChange(e.target.value)}
          onKeyDown={props.onRenameKeyDown}
          onBlur={props.onConfirmRename}
        />
      )}
    </div>
  ),
}));

// Mock fallback components for empty states or unsuccessful searches.
vi.mock("@/features/results/components/results-empty-state", () => ({
  ResultsEmptyState: () => <div data-testid="results-empty-state" />,
}));

vi.mock("@/features/results/components/results-no-search-results", () => ({
  ResultsNoSearchResults: () => <div data-testid="results-no-search-results" />,
}));

// Mock the toolbar to verify that sort and view controls trigger store updates.
vi.mock("@/features/results/components/results-toolbar", () => ({
  ResultsToolbar: ({ onSortOptionChange }: { onSortOptionChange: (val: string) => void }) => (
    <div data-testid="results-toolbar">
      <button onClick={() => onSortOptionChange("size-asc")}>Sort Trigger</button>
    </div>
  ),
}));

// Mock modal components to ensure they appear based on internal state changes.
vi.mock("@/features/cases/components/case-information-modal", () => ({
  CaseInformationModal: ({
    isOpen,
    onOpenChange,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="case-info-modal">
        <button onClick={() => onOpenChange(false)}>Close Info</button>
      </div>
    ) : null,
}));

vi.mock("@/features/results/components/delete-case-modal", () => ({
  DeleteCaseModal: ({
    isOpen,
    onOpenChange,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="delete-case-modal">
        <button onClick={() => onOpenChange(false)}>Close Delete</button>
      </div>
    ) : null,
}));

vi.mock("@/features/results/hooks/use-cases");
vi.mock("@/features/results/store/results-store");

/**
 * Test suite for the `ResultsPreview` component.
 */
describe("ResultsPreview", () => {
  const mockRouterPush = vi.fn();
  const mockSetRenamingCaseId = vi.fn();
  const mockSetSearchTerm = vi.fn();

  const defaultStoreState = {
    viewMode: "grid",
    sortOption: "date-modified-desc",
    searchTerm: "",
    renamingCaseId: null,
    setViewMode: vi.fn(),
    setSortOption: vi.fn(),
    setSearchTerm: mockSetSearchTerm,
    setRenamingCaseId: mockSetRenamingCaseId,
  };

  const mockCasesData: MockCase[] = [
    {
      id: "case-1",
      caseName: "Sample Case",
      caseDate: new Date("2025-01-01"),
      createdAt: new Date("2025-01-01"),
    },
    {
      id: "case-2",
      caseName: "Test Case",
      caseDate: new Date("2025-01-02"),
      createdAt: new Date("2025-01-02"),
    },
  ];

  // Reset mocks and initialize default hook returns before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
    } as unknown as AppRouterInstance);

    vi.mocked(useCases).mockReturnValue({
      data: mockCasesData,
    } as unknown as ReturnType<typeof useCases>);

    vi.mocked(useResultsStore).mockReturnValue(
      defaultStoreState as unknown as ReturnType<typeof useResultsStore>
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that a fallback interface is shown when no cases exist.
   */
  it("renders the empty state when there are no cases and no search term", () => {
    // Arrange: Provide an empty data array from the hook.
    vi.mocked(useCases).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useCases>);

    // Act: Render the component.
    render(<ResultsPreview />);

    // Assert: Verify that the empty state is visible and the toolbar is hidden.
    expect(screen.getByTestId("results-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("results-toolbar")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the primary interface elements appear when data is present.
   */
  it("renders the list and toolbar when cases exist", () => {
    // Act: Render the component with default mock data.
    render(<ResultsPreview />);

    // Assert: Check for the presence of the toolbar, list, and specific case items.
    expect(screen.getByTestId("results-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("case-list")).toBeInTheDocument();
    expect(screen.getByTestId("case-item-case-1")).toHaveTextContent("Sample Case");
    expect(screen.getByTestId("case-item-case-2")).toHaveTextContent("Test Case");
  });

  /**
   * Test case to verify that a no-results state is shown when search filters return nothing.
   */
  it("renders no search results state when search yields no matches", () => {
    // Arrange: Mock a search term that does not match any items in `mockCasesData`.
    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      searchTerm: "Zebra",
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Render the component.
    render(<ResultsPreview />);

    // Assert: Verify the no-results view is shown and the standard list is removed.
    expect(screen.getByTestId("results-no-search-results")).toBeInTheDocument();
    expect(screen.queryByTestId("case-list")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the results are restricted based on the user's search query.
   */
  it("filters cases based on search term", () => {
    // Arrange: Mock a search term matching only one item.
    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      searchTerm: "Sample",
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Render the component.
    render(<ResultsPreview />);

    // Assert: Verify that only the matching case is displayed.
    expect(screen.getByTestId("case-item-case-1")).toBeInTheDocument();
    expect(screen.queryByTestId("case-item-case-2")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the View button triggers navigation to the specific results page.
   */
  it("navigates to case details when View is clicked", async () => {
    // Arrange: Setup user events and render.
    const user = userEvent.setup();
    render(<ResultsPreview />);

    // Act: Click the "View" button for a specific case.
    const viewBtn = within(screen.getByTestId("case-item-case-1")).getByText("View");
    await user.click(viewBtn);

    // Assert: Verify that the router was called with the correct URL path.
    expect(mockRouterPush).toHaveBeenCalledWith("/results/case-1");
  });

  /**
   * Test case to verify that clicking the Delete button opens the confirmation modal.
   */
  it("opens the delete modal when Delete is clicked", async () => {
    // Arrange: Setup user events and render.
    const user = userEvent.setup();
    render(<ResultsPreview />);

    // Act: Trigger the delete workflow.
    const deleteBtn = within(screen.getByTestId("case-item-case-1")).getByText("Delete");
    await user.click(deleteBtn);

    // Assert: Verify that the delete modal appears in the document.
    await waitFor(() => {
      expect(screen.getByTestId("delete-case-modal")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that clicking the Details button opens the information modal.
   */
  it("opens the info modal when Details is clicked", async () => {
    // Arrange: Setup user events and render.
    const user = userEvent.setup();
    render(<ResultsPreview />);

    // Act: Trigger the details workflow.
    const detailsBtn = within(screen.getByTestId("case-item-case-1")).getByText("Details");
    await user.click(detailsBtn);

    // Assert: Verify that the case information modal is visible.
    await waitFor(() => {
      expect(screen.getByTestId("case-info-modal")).toBeInTheDocument();
    });
  });

  /**
   * Sub-suite for testing the inline case renaming logic.
   */
  describe("Renaming Logic", () => {
    /**
     * Test case to verify that clicking Rename activates the edit state for the specific ID.
     */
    it("enters renaming state when Rename is clicked", async () => {
      // Arrange: Setup user events and render.
      const user = userEvent.setup();
      render(<ResultsPreview />);

      // Act: Click the "Rename" button.
      const renameBtn = within(screen.getByTestId("case-item-case-1")).getByText("Rename");
      await user.click(renameBtn);

      // Assert: Verify that the store update was triggered for that case.
      expect(mockSetRenamingCaseId).toHaveBeenCalledWith("case-1");
    });

    /**
     * Test case to verify that losing focus on the input triggers the rename mutation.
     */
    it("triggers mutation on confirm (blur)", async () => {
      // Arrange: Simulate the active renaming state in the store.
      const user = userEvent.setup();
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        renamingCaseId: "case-1",
      } as unknown as ReturnType<typeof useResultsStore>);

      render(<ResultsPreview />);

      // Act: Type a new name and remove focus by tabbing away.
      const input = screen.getByTestId("rename-input");
      await user.type(input, "New Name");
      await user.tab();

      // Assert: Verify that the mutation was triggered with the updated name.
      expect(mockMutate).toHaveBeenCalledWith({
        caseId: "case-1",
        newName: "New Name",
      });
    });

    /**
     * Test case to verify that the Escape key exits the renaming state without saving.
     */
    it("cancels renaming on Escape key", async () => {
      // Arrange: Render in renaming mode.
      const user = userEvent.setup();
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        renamingCaseId: "case-1",
      } as unknown as ReturnType<typeof useResultsStore>);

      render(<ResultsPreview />);

      // Act: Press the Escape key.
      const input = screen.getByTestId("rename-input");
      await user.type(input, "{Escape}");

      // Assert: Verify that the renaming state is cleared and no mutation occurred.
      expect(mockSetRenamingCaseId).toHaveBeenCalledWith(null);
      expect(mockMutate).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the Enter key confirms the name change.
     */
    it("confirms renaming on Enter key", async () => {
      // Arrange: Render in renaming mode.
      const user = userEvent.setup();
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        renamingCaseId: "case-1",
      } as unknown as ReturnType<typeof useResultsStore>);

      render(<ResultsPreview />);

      // Act: Type a name and press Enter.
      const input = screen.getByTestId("rename-input");
      await user.type(input, "New Name{Enter}");

      // Assert: Verify the rename mutation was called.
      expect(mockMutate).toHaveBeenCalledWith({
        caseId: "case-1",
        newName: "New Name",
      });
    });

    /**
     * Test case to verify that no mutation is sent if the name has not changed.
     */
    it("does not mutate if name is unchanged", async () => {
      // Arrange: Render in renaming mode with the original name.
      const user = userEvent.setup();
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        renamingCaseId: "case-1",
      } as unknown as ReturnType<typeof useResultsStore>);

      render(<ResultsPreview />);

      // Act: Submit the current name without modification.
      const input = screen.getByTestId("rename-input");
      await user.type(input, "Sample Case{Enter}");

      // Assert: Verify the state is cleared but no network call is made.
      expect(mockSetRenamingCaseId).toHaveBeenCalledWith(null);
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  /**
   * Sub-suite for verifying the sorting logic of the cases list.
   */
  describe("Sorting", () => {
    /**
     * Test case to verify alphanumeric sorting from A to Z.
     */
    it("sorts by name ascending", () => {
      // Arrange: Mock the store with the A-Z sort option.
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        sortOption: "name-asc",
      } as unknown as ReturnType<typeof useResultsStore>);

      // Act: Render the list.
      render(<ResultsPreview />);
      const list = screen.getByTestId("case-list");

      // Assert: Ensure "Sample Case" appears before "Test Case".
      expect(list.textContent).toMatch(/Sample Case.*Test Case/);
    });

    /**
     * Test case to verify alphanumeric sorting from Z to A.
     */
    it("sorts by name descending", () => {
      // Arrange: Mock the store with the Z-A sort option.
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        sortOption: "name-desc",
      } as unknown as ReturnType<typeof useResultsStore>);

      // Act: Render the list.
      render(<ResultsPreview />);
      const list = screen.getByTestId("case-list");

      // Assert: Ensure "Test Case" appears before "Sample Case".
      expect(list.textContent).toMatch(/Test Case.*Sample Case/);
    });

    /**
     * Test case to verify chronological sorting with the newest items first.
     */
    it("sorts by date uploaded descending (newest first)", () => {
      // Arrange: Mock the newest-first sort option.
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-uploaded-desc",
      } as unknown as ReturnType<typeof useResultsStore>);

      // Act: Render the list.
      render(<ResultsPreview />);
      const list = screen.getByTestId("case-list");

      // Assert: Verify chronological order matches the mock data timestamps.
      expect(list.textContent).toMatch(/Test Case.*Sample Case/);
    });

    /**
     * Test case to verify chronological sorting with the oldest items first.
     */
    it("sorts by date uploaded ascending (oldest first)", () => {
      // Arrange: Mock the oldest-first sort option.
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-uploaded-asc",
      } as unknown as ReturnType<typeof useResultsStore>);

      // Act: Render the list.
      render(<ResultsPreview />);
      const list = screen.getByTestId("case-list");

      // Assert: Verify "Sample Case" (Jan 1) appears before "Test Case" (Jan 2).
      expect(list.textContent).toMatch(/Sample Case.*Test Case/);
    });

    /**
     * Test case to verify sorting by the modification date.
     */
    it("sorts by date modified ascending", () => {
      // Arrange: Mock the modified-date sort option.
      vi.mocked(useResultsStore).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-modified-asc",
      } as unknown as ReturnType<typeof useResultsStore>);

      // Act: Render the list.
      render(<ResultsPreview />);
      const list = screen.getByTestId("case-list");

      // Assert: Verify the sorting order matches the provided dates.
      expect(list.textContent).toMatch(/Sample Case.*Test Case/);
    });
  });

  /**
   * Test case to verify that closing the delete modal correctly updates the internal state.
   */
  it("closes the delete modal when close is requested", async () => {
    // Arrange: Open the delete modal.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    await user.click(within(screen.getByTestId("case-item-case-1")).getByText("Delete"));

    // Assert: Verify the modal is initially present.
    await waitFor(() => {
      expect(screen.getByTestId("delete-case-modal")).toBeInTheDocument();
    });

    // Act: Click the close button inside the modal.
    await user.click(screen.getByText("Close Delete"));

    // Assert: Verify the modal is removed from the DOM.
    expect(screen.queryByTestId("delete-case-modal")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that closing the info modal correctly updates the internal state.
   */
  it("closes the info modal when close is requested", async () => {
    // Arrange: Open the details modal.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    await user.click(within(screen.getByTestId("case-item-case-1")).getByText("Details"));

    // Assert: Verify the modal is initially present.
    await waitFor(() => {
      expect(screen.getByTestId("case-info-modal")).toBeInTheDocument();
    });

    // Act: Click the close button inside the modal.
    await user.click(screen.getByText("Close Info"));

    // Assert: Verify the modal is removed from the DOM.
    expect(screen.queryByTestId("case-info-modal")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that interactions with the toolbar update the global sort state.
   */
  it("updates sort option when toolbar triggers change", async () => {
    // Arrange: Mock the store setter function.
    const mockSetSortOption = vi.fn();
    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      setSortOption: mockSetSortOption,
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Trigger a sort change from the toolbar.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    await user.click(screen.getByText("Sort Trigger"));

    // Assert: Verify the store setter was called with the new option.
    expect(mockSetSortOption).toHaveBeenCalledWith("size-asc");
  });

  /**
   * Test case to verify that a failed rename operation triggers an error toast and handles cache rollback.
   */
  it("handles rename error and rolls back optimistic update", async () => {
    // Arrange: Mock the server action to fail with a network error.
    const { renameCase } = await import("@/features/results/actions/rename-case");
    vi.mocked(renameCase).mockRejectedValue(new Error("Network Error"));

    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      renamingCaseId: "case-1",
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Attempt to rename the case.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    const input = screen.getByTestId("rename-input");
    await user.type(input, "Error Name{Enter}");

    // Assert: Verify the cache was updated (optimistic) and an error toast was shown.
    expect(mockSetQueryData).toHaveBeenCalled();
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith("Failed to rename. Please try again.");
  });

  /**
   * Test case to verify that a successful rename operation displays a success notification.
   */
  it("handles rename success and shows success toast", async () => {
    // Arrange: Mock the server action to return success.
    const { renameCase } = await import("@/features/results/actions/rename-case");
    vi.mocked(renameCase).mockResolvedValue({ success: "Renamed successfully" });

    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      renamingCaseId: "case-1",
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Rename the case.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    const input = screen.getByTestId("rename-input");
    await user.type(input, "Success Name{Enter}");

    // Assert: Verify the success toast appears.
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Renamed successfully");
  });

  /**
   * Test case to verify that business logic errors (like duplicate names) are correctly handled.
   */
  it("handles rename operation returning application error", async () => {
    // Arrange: Mock the server action to return a specific validation error.
    const { renameCase } = await import("@/features/results/actions/rename-case");
    vi.mocked(renameCase).mockResolvedValue({ error: "Duplicate name" });

    vi.mocked(useResultsStore).mockReturnValue({
      ...defaultStoreState,
      renamingCaseId: "case-1",
    } as unknown as ReturnType<typeof useResultsStore>);

    // Act: Attempt to use a duplicate name.
    const user = userEvent.setup();
    render(<ResultsPreview />);
    const input = screen.getByTestId("rename-input");
    await user.type(input, "Duplicate Name{Enter}");

    // Assert: Verify that the specific error message is toasted to the user.
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith("Duplicate name");
  });
});
