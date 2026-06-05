const SOURCE_KEY = 'ticketSource';
const PROMOCODE_KEY = 'ticketPromocode';
const TICKET_HOST = 'ti.to';

const getStored = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const capture = (param: string, key: string) => {
  const value = new URLSearchParams(location.search).get(param);
  if (!value) {
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable (e.g. private browsing) — degrade to a no-op
  }
};

const rewriteTicketAnchor = (event: Event) => {
  const source = getStored(SOURCE_KEY);
  const promocode = getStored(PROMOCODE_KEY);
  if (!source && !promocode) {
    return;
  }
  for (const target of event.composedPath()) {
    if (target instanceof HTMLAnchorElement && target.hostname === TICKET_HOST) {
      try {
        const url = new URL(target.href);
        let changed = false;
        // Tito discount URLs are path-based: ti.to/:org/:event[/...]/discount/:code
        if (promocode && !url.pathname.includes('/discount/')) {
          url.pathname = `${url.pathname.replace(/\/+$/, '')}/discount/${encodeURIComponent(
            promocode,
          )}`;
          changed = true;
        }
        if (source && !url.searchParams.has('source')) {
          url.searchParams.set('source', source);
          changed = true;
        }
        if (changed) {
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
  capture('source', SOURCE_KEY);
  capture('promocode', PROMOCODE_KEY);
  // pointerdown covers middle-click and right-click → "copy link";
  // click covers keyboard activation. Rewriting is idempotent.
  document.addEventListener('click', rewriteTicketAnchor, { passive: true });
  document.addEventListener('pointerdown', rewriteTicketAnchor, { passive: true });
};
