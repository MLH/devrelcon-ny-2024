const STORAGE_KEY = 'ticketSource';
const TICKET_HOST = 'ti.to';

const getStoredSource = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const captureSource = () => {
  const source = new URLSearchParams(location.search).get('source');
  if (!source) {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, source);
  } catch {
    // Storage unavailable (e.g. private browsing) — degrade to a no-op
  }
};

const rewriteTicketAnchor = (event: Event) => {
  const source = getStoredSource();
  if (!source) {
    return;
  }
  for (const target of event.composedPath()) {
    if (target instanceof HTMLAnchorElement && target.hostname === TICKET_HOST) {
      try {
        const url = new URL(target.href);
        if (!url.searchParams.has('source')) {
          url.searchParams.set('source', source);
          target.href = url.toString();
        }
      } catch {
        // Malformed href — leave it untouched
      }
      return;
    }
  }
};

export const initTicketSource = () => {
  captureSource();
  // pointerdown covers middle-click and right-click → "copy link";
  // click covers keyboard activation. Rewriting is idempotent.
  document.addEventListener('click', rewriteTicketAnchor, { passive: true });
  document.addEventListener('pointerdown', rewriteTicketAnchor, { passive: true });
};
