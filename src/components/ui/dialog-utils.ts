const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

export function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = getFocusableElements(container);

  if (!focusableElements.length) {
    event.preventDefault();
    container?.focus();
    return;
  }

  const activeElement = document.activeElement;
  const currentIndex = focusableElements.findIndex((element) => element === activeElement);
  const nextIndex = event.shiftKey
    ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
    : (currentIndex === -1 || currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1);

  event.preventDefault();
  focusableElements[nextIndex]?.focus();
}
