import type { BackendFactory } from "dnd-core";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";

/**
 * HTML5Backend only handles mouse events — tablets use touch, so drag-and-drop
 * fails on step 2. Use TouchBackend when the device reports touch / coarse pointer.
 */
export function prefersTouchDnD(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  } catch {
    /* matchMedia unavailable */
  }
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return true;
  return "ontouchstart" in window;
}

/** Options for TouchBackend: allow mouse too on hybrid laptops; minimal delay so drag feels immediate. */
const touchBackendOptions = {
  enableMouseEvents: true,
  delay: 0,
  delayTouchStart: 0,
};

export function getChecklistStep2DndBackend(): BackendFactory {
  return prefersTouchDnD() ? TouchBackend : HTML5Backend;
}

export function getChecklistStep2DndOptions(): typeof touchBackendOptions | undefined {
  return prefersTouchDnD() ? touchBackendOptions : undefined;
}
