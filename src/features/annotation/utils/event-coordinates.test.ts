import { describe, expect, it } from "vitest";

import { eventCoordinates } from "@/features/annotation/utils/event-coordinates";

/**
 * Test suite for the `eventCoordinates` utility.
 */
describe("eventCoordinates", () => {
  /**
   * Test case to verify coordinate extraction from a standard browser MouseEvent.
   */
  it("extracts coordinates from a native MouseEvent", () => {
    // Arrange: Create a native mouse event with specific horizontal and vertical positions.
    const event = new MouseEvent("click", { clientX: 100, clientY: 200 });

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Check if the returned values match the original `clientX` and `clientY` properties.
    expect(coords).toEqual({ clientX: 100, clientY: 200 });
  });

  /**
   * Test case to verify coordinate extraction from a React-wrapped Synthetic MouseEvent.
   */
  it("extracts coordinates from a React Synthetic MouseEvent", () => {
    // Arrange: Define a mock object representing a React mouse event.
    const event = {
      clientX: 150,
      clientY: 250,
    } as React.MouseEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Check if the extraction correctly identifies the properties on the synthetic event.
    expect(coords).toEqual({ clientX: 150, clientY: 250 });
  });

  /**
   * Test case to verify coordinate extraction from the primary touches array of a native TouchEvent.
   */
  it("extracts coordinates from a native TouchEvent with touches", () => {
    // Arrange: Create a touch object and a mock native event containing that touch in the `touches` list.
    const touch = { clientX: 50, clientY: 60 };
    const event = {
      touches: [touch],
      changedTouches: [],
    } as unknown as TouchEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Verify that the utility pulls data from the first entry of the `touches` array.
    expect(coords).toEqual({ clientX: 50, clientY: 60 });
  });

  /**
   * Test case to verify coordinate extraction from the touches array of a React Synthetic TouchEvent.
   */
  it("extracts coordinates from a React Synthetic TouchEvent with touches", () => {
    // Arrange: Create a touch object and a mock React touch event.
    const touch = { clientX: 70, clientY: 80 };
    const event = {
      touches: [touch],
      changedTouches: [],
    } as unknown as React.TouchEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Verify that the utility pulls data from the first entry of the synthetic `touches` array.
    expect(coords).toEqual({ clientX: 70, clientY: 80 });
  });

  /**
   * Test case to verify that coordinates are retrieved from changedTouches if the primary touches list is unavailable.
   */
  it("extracts coordinates from changedTouches when touches list is empty", () => {
    // Arrange: Define an event where `touches` is empty but `changedTouches` contains data.
    const touch = { clientX: 90, clientY: 100 };
    const event = {
      touches: [],
      changedTouches: [touch],
    } as unknown as TouchEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Ensure the utility falls back to the `changedTouches` list correctly.
    expect(coords).toEqual({ clientX: 90, clientY: 100 });
  });

  /**
   * Test case to verify that the utility prioritizes active touches over changed touches.
   */
  it("prioritizes touches over changedTouches if both exist", () => {
    // Arrange: Create an event containing different coordinate data in `touches` and `changedTouches`.
    const touch1 = { clientX: 10, clientY: 20 };
    const touch2 = { clientX: 30, clientY: 40 };
    const event = {
      touches: [touch1],
      changedTouches: [touch2],
    } as unknown as TouchEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Check that `touch1` from the `touches` list is prioritized.
    expect(coords).toEqual({ clientX: 10, clientY: 20 });
  });

  /**
   * Test case to verify fallback logic to direct event properties when touch arrays are present but empty.
   */
  it("falls back to clientX/Y properties if touch lists are empty but present", () => {
    // Arrange: Create a hybrid event mock with empty touch lists but valid direct coordinates.
    const event = {
      touches: [],
      changedTouches: [],
      clientX: 300,
      clientY: 400,
    } as unknown as React.MouseEvent;

    // Act: Extract the coordinates using the utility function.
    const coords = eventCoordinates(event);

    // Assert: Verify that the utility resorts to top-level `clientX` and `clientY` properties.
    expect(coords).toEqual({ clientX: 300, clientY: 400 });
  });
});
