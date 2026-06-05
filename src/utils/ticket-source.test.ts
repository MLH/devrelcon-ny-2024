import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { initTicketSource } from './ticket-source';

describe('ticket-source', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  const titoAnchor = (href = 'https://ti.to/mlh/devrelcon-2026') => {
    const anchor = document.createElement('a');
    anchor.href = href;
    document.body.appendChild(anchor);
    return anchor;
  };

  const pointerdown = (target: Element) => {
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
  };

  describe('initTicketSource', () => {
    it('captures ?source= into sessionStorage', () => {
      window.history.replaceState({}, '', '/?source=myad');

      initTicketSource();

      expect(sessionStorage.getItem('ticketSource')).toBe('myad');
    });

    it('preserves a previously stored source when the param is absent', () => {
      sessionStorage.setItem('ticketSource', 'myad');

      initTicketSource();

      expect(sessionStorage.getItem('ticketSource')).toBe('myad');
    });

    it('captures ?promocode= into sessionStorage', () => {
      window.history.replaceState({}, '', '/?promocode=mycode');

      initTicketSource();

      expect(sessionStorage.getItem('ticketPromocode')).toBe('mycode');
    });

    it('preserves a previously stored promocode when the param is absent', () => {
      sessionStorage.setItem('ticketPromocode', 'mycode');

      initTicketSource();

      expect(sessionStorage.getItem('ticketPromocode')).toBe('mycode');
    });

    it('captures source and promocode from one landing URL', () => {
      window.history.replaceState({}, '', '/?promocode=mycode&source=dev.to');

      initTicketSource();

      expect(sessionStorage.getItem('ticketSource')).toBe('dev.to');
      expect(sessionStorage.getItem('ticketPromocode')).toBe('mycode');
    });

    it('does not throw when sessionStorage is unavailable', () => {
      window.history.replaceState({}, '', '/?source=myad');
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      expect(() => initTicketSource()).not.toThrow();
    });
  });

  describe('rewriting', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/?source=myad');
      initTicketSource();
    });

    it('appends the stored source to a ti.to anchor on pointerdown', () => {
      const anchor = titoAnchor();

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026?source=myad');
    });

    it('appends the stored source to a ti.to anchor on click', () => {
      const anchor = titoAnchor();
      document.addEventListener('click', (event) => event.preventDefault());

      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026?source=myad');
    });

    it('rewrites a ti.to anchor inside a shadow root', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const anchor = document.createElement('a');
      anchor.href = 'https://ti.to/mlh/devrelcon-2026';
      shadow.appendChild(anchor);

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026?source=myad');
    });

    it('preserves existing query params on the ti.to URL', () => {
      const anchor = titoAnchor('https://ti.to/mlh/devrelcon-2026?release=xyz');

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026?release=xyz&source=myad');
    });

    it('does not overwrite an existing source param', () => {
      const anchor = titoAnchor('https://ti.to/mlh/devrelcon-2026?source=original');

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026?source=original');
    });

    it('leaves non-Tito anchors untouched', () => {
      const anchor = titoAnchor('https://example.com/tickets');

      pointerdown(anchor);

      expect(anchor.href).toBe('https://example.com/tickets');
    });

    it('is a no-op when no source is stored', () => {
      sessionStorage.clear();
      const anchor = titoAnchor();

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026');
    });
  });

  describe('promocode rewriting', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/?promocode=mycode');
      initTicketSource();
    });

    it('appends /discount/<code> to a bare event URL', () => {
      const anchor = titoAnchor();

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026/discount/mycode');
    });

    it('appends /discount/<code> after a deeper path', () => {
      const anchor = titoAnchor('https://ti.to/mlh/devrelcon-2026/with/supporter-ticket');

      pointerdown(anchor);

      expect(anchor.href).toBe(
        'https://ti.to/mlh/devrelcon-2026/with/supporter-ticket/discount/mycode',
      );
    });

    it('skips links that already contain /discount/', () => {
      const anchor = titoAnchor('https://ti.to/mlh/devrelcon-2026/discount/existing');

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026/discount/existing');
    });

    it('URL-encodes the promocode', () => {
      sessionStorage.setItem('ticketPromocode', '50% off');
      const anchor = titoAnchor();

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026/discount/50%25%20off');
    });
  });

  describe('combined source and promocode rewriting', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/?promocode=mycode&source=dev.to');
      initTicketSource();
    });

    it('applies the path and query rewrites together', () => {
      const anchor = titoAnchor();

      pointerdown(anchor);

      expect(anchor.href).toBe('https://ti.to/mlh/devrelcon-2026/discount/mycode?source=dev.to');
    });
  });
});
