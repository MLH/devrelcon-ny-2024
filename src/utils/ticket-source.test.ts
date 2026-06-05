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
});
