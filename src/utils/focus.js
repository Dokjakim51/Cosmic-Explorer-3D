export function focusMainContent(main) {
  const skipLinkUsed = document.activeElement?.classList?.contains('skip-link');
  if (skipLinkUsed) main.focus({ preventScroll: true });
}

export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const focusable = [...container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hidden);

  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
