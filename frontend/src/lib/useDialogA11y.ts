import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Gives a modal/dialog standard accessible behavior:
 * - Escape key closes it
 * - Tab/Shift+Tab cycles focus within the dialog only (focus trap)
 * - Focus moves into the dialog on open, and back to the trigger element on close
 *
 * Usage: const containerRef = useDialogA11y(isOpen, onClose);
 * Attach containerRef to the outermost dialog element.
 */
export function useDialogA11y(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusFirst = () => {
      const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable?.[0] ?? container)?.focus();
    };
    // Slight delay so the element is painted before we try to focus it
    const focusTimer = setTimeout(focusFirst, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && container) {
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
          (el) => el.offsetParent !== null
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
