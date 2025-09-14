import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UploadFormHeader } from "@/features/upload/components/upload-form-header";

// Mock the shadcn card to isolate the `UploadFormHeader` for testing.
vi.mock("@/components/ui/card", () => ({
  CardHeader: ({ children, className }: React.ComponentProps<"div">) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: React.ComponentProps<"h3">) => (
    <h3 className={className}>{children}</h3>
  ),
  CardDescription: ({ children, className }: React.ComponentProps<"p">) => (
    <p className={className}>{children}</p>
  ),
}));

/**
 * Test suite for the `UploadFormHeader` component.
 */
describe("UploadFormHeader", () => {
  /**
   * Test case to verify that the component correctly renders the static title and corresponding description text.
   */
  it("renders the title and description correctly", () => {
    // Arrange: Render the component.
    render(<UploadFormHeader />);

    // Assert: Check for the presence of the main heading with the text "Provide an Image".
    expect(screen.getByRole("heading", { name: "Provide an Image" })).toBeInTheDocument();

    // Assert: Check for the presence of the descriptive text explaining the user's options.
    expect(
      screen.getByText(
        "Choose to upload an image file or take a new one with your device's camera."
      )
    ).toBeInTheDocument();
  });
});
