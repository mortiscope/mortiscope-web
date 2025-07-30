import { useMemo, useState } from "react";

/**
 * A generic interface constraint ensuring that items passed to the hook
 * have a unique `id` property of type string.
 */
interface Item {
  id: string;
}

/**
 * Defines the props for the useSelectionNavigator hook.
 * @template T The type of the items in the list, which must extend the `Item` interface.
 */
interface UseSelectionNavigatorProps<T extends Item> {
  /** The array of items to be managed by the hook. */
  items: T[];
}

/**
 * A generic hook to manage selection and navigation within a list of items.
 *
 * @template T The type of the items, constrained to have an `id` property.
 * @param {UseSelectionNavigatorProps<T>} props The props for the hook, containing the list of items.
 * @returns A controller object with the current state and navigation functions.
 */
export const useSelectionNavigator = <T extends Item>({ items }: UseSelectionNavigatorProps<T>) => {
  /** A boolean state to manage the visibility of the controlled component. */
  const [isOpen, setIsOpen] = useState(false);
  /** A state that stores the unique ID of the currently selected item, or null if none is selected. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * Memoizes the currently selected item object.
   */
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((item) => item.id === selectedId) ?? null;
  }, [selectedId, items]);

  /**
   * Memoizes the index of the currently selected item within the `items` array.
   * This is used for efficient 'next' and 'previous' navigation logic. Returns -1 if no item is selected.
   */
  const currentIndex = useMemo(() => {
    if (!selectedId) return -1;
    return items.findIndex((item) => item.id === selectedId);
  }, [selectedId, items]);

  /**
   * Opens the controlled component and sets the selected item by its object.
   * @param item The item object to select and display.
   */
  const open = (item: T) => {
    setSelectedId(item.id);
    setIsOpen(true);
  };

  /**
   * Closes the controlled component.
   */
  const close = () => {
    setIsOpen(false);
    // Defer resetting the selected item to avoid content disappearing during closing animation.
    setTimeout(() => setSelectedId(null), 300);
  };

  /**
   * Navigates to the next item in the list, if one exists.
   */
  const next = () => {
    if (currentIndex > -1 && currentIndex < items.length - 1) {
      setSelectedId(items[currentIndex + 1].id);
    }
  };

  /**
   * Navigates to the previous item in the list, if one exists.
   */
  const previous = () => {
    if (currentIndex > 0) {
      setSelectedId(items[currentIndex - 1].id);
    }
  };

  /**
   * Selects an item directly by its ID, if it exists in the `items` array.
   * @param id The unique ID of the item to select.
   */
  const selectById = (id: string) => {
    const itemExists = items.some((item) => item.id === id);
    if (itemExists) {
      setSelectedId(id);
    }
  };

  // Exposes the public API of the hook for the consuming component.
  return {
    isOpen,
    selectedItem,
    open,
    close,
    next,
    previous,
    selectById,
  };
};
