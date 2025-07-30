"use client";

import { useMemo } from "react";

/**
 * A generic interface constraint ensuring that items passed to the hook
 * have a unique `id` property of type string. This is required to reliably find
 * the currently active item.
 */
interface Item {
  id: string;
}

/**
 * A generic hook that computes navigation state (hasNext, hasPrevious) for a list of items.
 * This is a performance-optimized utility for UI components like carousels, galleries, or modals
 * that need to determine the availability of next/previous actions.
 *
 * @template T The type of the items, which must extend the `Item` interface.
 * @param items The array of items to navigate through.
 * @param activeItem The currently selected item from the list.
 * @returns An object containing `hasNext` and `hasPrevious` booleans.
 */
export const useListNavigation = <T extends Item>(items: T[], activeItem: T | null) => {
  /**
   * Memoizes the index of the currently active item within the list.
   */
  const currentIndex = useMemo(() => {
    if (!activeItem) return -1;
    return items.findIndex((item) => item.id === activeItem.id);
  }, [activeItem, items]);

  /**
   * A memoized boolean indicating if there is a next item available for navigation.
   */
  const hasNext = useMemo(
    () => currentIndex > -1 && currentIndex < items.length - 1,
    [currentIndex, items.length]
  );

  /**
   * A memoized boolean indicating if there is a previous item available for navigation.
   */
  const hasPrevious = useMemo(() => currentIndex > 0, [currentIndex]);

  // Exposes the derived navigation state for the consuming component.
  return {
    hasNext,
    hasPrevious,
  };
};
