"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HiMiniArrowPath, HiOutlineLockClosed } from "react-icons/hi2";
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoArrowRedoOutline, IoArrowUndoOutline, IoHandRightOutline } from "react-icons/io5";
import { IoTrashBinOutline } from "react-icons/io5";
import { LuFocus } from "react-icons/lu";
import {
  PiBoundingBox,
  PiCursor,
  PiFloppyDiskBack,
  PiSelectionInverse,
  PiSquare,
} from "react-icons/pi";
import { TbRotate } from "react-icons/tb";

import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

/**
 * A specialized presentational sub-component designed to parse and render keyboard
 * shortcut strings in a user-friendly format. It handles splitting alternatives,
 * joining combinations with a "+" sign, and capitalizing key names. It also filters out
 * Mac-specific meta key combinations for a cleaner display on most platforms.
 *
 * @param {object} props The component props.
 * @param {string} props.keys A string representing the key combination(s) (e.g., "ctrl+s, meta+s").
 * @returns A React span element with the formatted shortcut text.
 */
const KeyBadge = ({ keys }: { keys: string }) => {
  const keyArray = keys.split(", ");

  // Filter out Mac-specific shortcuts (containing 'meta') for a cleaner, more universal display.
  const windowsShortcuts = keyArray.filter((key) => !key.includes("meta"));

  return (
    <span>
      {windowsShortcuts.map((key, index) => {
        // Parse the key combination string.
        const parts = key.split("+");

        // Format each part for consistent capitalization and special key names.
        const formattedParts = parts.map((part) => {
          const formatted = part
            .replace("ctrl", "Ctrl")
            .replace("shift", "Shift")
            .replace("alt", "Alt")
            .replace("BracketLeft", "[")
            .replace("BracketRight", "]")
            .replace("Equal", "=")
            .replace("Minus", "-")
            .replace("escape", "Esc")
            .replace("delete", "Delete")
            .replace("backspace", "Backspace");

          // Uppercase single letters (e.g., "h" -> "H").
          return formatted.length === 1 ? formatted.toUpperCase() : formatted;
        });

        // Join the parts with a " + " for natural spacing.
        const shortcut = formattedParts.join(" + ");

        // Add a " / " separator between alternative shortcuts.
        return (
          <span key={index}>
            {shortcut}
            {index < windowsShortcuts.length - 1 && " / "}
          </span>
        );
      })}
    </span>
  );
};

/**
 * A presentational component that displays a comprehensive list of all available
 * keyboard shortcuts for the annotation editor. It uses a configuration-driven
 * approach and animates the list items into view.
 *
 * @returns A React component representing the shortcuts panel.
 */
export const DetailsShortcutsPanel = () => {
  /**
   * A configuration array that defines the content for each shortcut entry in the list.
   * This approach centralizes the data, making the interface easy to manage and update.
   */
  const shortcuts = [
    // Editor Header
    {
      icon: IoIosArrowRoundBack,
      label: "Back Navigation",
      keys: KEYBOARD_SHORTCUTS.BACK_NAVIGATION,
    },
    { icon: ChevronLeft, label: "Previous Image", keys: KEYBOARD_SHORTCUTS.PREVIOUS_IMAGE },
    { icon: ChevronRight, label: "Next Image", keys: KEYBOARD_SHORTCUTS.NEXT_IMAGE },
    {
      icon: HiOutlineLockClosed,
      label: "Lock/Unlock Editor",
      keys: KEYBOARD_SHORTCUTS.TOGGLE_LOCK,
    },
    { icon: PiFloppyDiskBack, label: "Save", keys: KEYBOARD_SHORTCUTS.SAVE },

    // Tool Selection
    { icon: IoHandRightOutline, label: "Pan Mode", keys: KEYBOARD_SHORTCUTS.PAN_MODE },
    { icon: PiCursor, label: "Select Mode", keys: KEYBOARD_SHORTCUTS.SELECT_MODE },
    { icon: PiBoundingBox, label: "Draw Mode", keys: KEYBOARD_SHORTCUTS.DRAW_MODE },

    // View Controls
    { icon: PiSquare, label: "Toggle Minimap", keys: KEYBOARD_SHORTCUTS.TOGGLE_MINIMAP },
    { icon: LuFocus, label: "Center Focus", keys: KEYBOARD_SHORTCUTS.CENTER_FOCUS },
    { icon: TbRotate, label: "Reset View", keys: KEYBOARD_SHORTCUTS.RESET_VIEW },

    // History
    { icon: IoArrowUndoOutline, label: "Undo", keys: KEYBOARD_SHORTCUTS.UNDO },
    { icon: IoArrowRedoOutline, label: "Redo", keys: KEYBOARD_SHORTCUTS.REDO },
    { icon: HiMiniArrowPath, label: "Reset Changes", keys: KEYBOARD_SHORTCUTS.RESET_CHANGES },

    // Selection Actions
    { icon: IoTrashBinOutline, label: "Delete Selected", keys: KEYBOARD_SHORTCUTS.DELETE_SELECTED },
    { icon: PiSelectionInverse, label: "Deselect", keys: KEYBOARD_SHORTCUTS.DESELECT },
  ];

  return (
    // The main container orchestrating the animations of its children.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delayChildren: 0.1, staggerChildren: 0.05 }}
      className="space-y-4"
    >
      {shortcuts.map((shortcut, index) => {
        const Icon = shortcut.icon;
        return (
          // Each individual shortcut item has its own entry animation.
          <motion.div
            key={shortcut.label}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: index * 0.05 }}
            className="flex items-center gap-3"
          >
            <Icon className="h-6 w-6 flex-shrink-0 text-white" />
            <div className="min-w-0 flex-1">
              <p className="font-inter text-xs tracking-wide text-emerald-200">{shortcut.label}</p>
              <div className="font-inter text-sm break-words hyphens-auto text-white">
                <KeyBadge keys={shortcut.keys} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

DetailsShortcutsPanel.displayName = "DetailsShortcutsPanel";
