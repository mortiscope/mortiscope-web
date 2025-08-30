/**
 * A utility function to lighten a given hex color. This is used to generate
 * the border color for the selected radio button item.
 *
 * @param hex The base hex color string.
 * @returns A lightened hex color string.
 */
export const getLightenedColor = (hex: string): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const factor = 1.25;
  const r = Math.min(255, Math.floor((num >> 16) * factor));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) * factor));
  const b = Math.min(255, Math.floor((num & 0x0000ff) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};
