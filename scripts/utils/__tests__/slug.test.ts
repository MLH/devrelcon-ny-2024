import { toSlug } from '../slug';

describe('toSlug', () => {
  it('lowercases and underscores spaces', () => {
    expect(toSlug('Jane Doe')).toBe('jane_doe');
  });

  it('strips non-alphanumeric characters', () => {
    expect(toSlug("Mary O'Brien-Smith")).toBe('mary_obriensmith');
  });

  it('collapses multiple spaces and underscores', () => {
    expect(toSlug('Foo   Bar   Baz')).toBe('foo_bar_baz');
  });

  it('trims leading and trailing underscores', () => {
    expect(toSlug('  Jane  ')).toBe('jane');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });
});
