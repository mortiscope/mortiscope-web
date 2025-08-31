/**
 * Helper function to extract clientX and clientY coordinates from mouse or touch events.
 * Works with both React synthetic events and native DOM events.
 *
 * @param e - Mouse or touch event (React or native)
 * @returns Object containing clientX and clientY coordinates
 */
export const eventCoordinates = (
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
): { clientX: number; clientY: number } => {
  if ("touches" in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if ("changedTouches" in e && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return {
    clientX: (e as MouseEvent | React.MouseEvent).clientX,
    clientY: (e as MouseEvent | React.MouseEvent).clientY,
  };
};
