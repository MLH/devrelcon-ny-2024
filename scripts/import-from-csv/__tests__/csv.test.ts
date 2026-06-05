import { describe, expect, it } from '@jest/globals';
import { parseCsv } from '../csv';

const HEADER = [
  'title',
  'description',
  'stage',
  'day',
  'startTime',
  'endTime',
  'speakerName',
  'speakerTitle',
  'speakerHeadshotUrl',
  'speakerCompany',
].join(',');

describe('parseCsv', () => {
  it('parses a well-formed row', () => {
    const csv = [
      HEADER,
      'Talk A,A description,Main Stage,2026-10-12,11:00,11:40,Jane Doe,Head of DevRel,https://x/y.jpg,Acme',
    ].join('\n');

    expect(parseCsv(csv)).toEqual([
      {
        title: 'Talk A',
        description: 'A description',
        stage: 'Main Stage',
        day: '2026-10-12',
        startTime: '11:00',
        endTime: '11:40',
        speakerName: 'Jane Doe',
        speakerTitle: 'Head of DevRel',
        speakerHeadshotUrl: 'https://x/y.jpg',
        speakerCompany: 'Acme',
      },
    ]);
  });

  it('handles quoted commas in description', () => {
    const csv = [
      HEADER,
      '"Talk, with comma","Desc, with comma",Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,,Acme',
    ].join('\n');

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('Talk, with comma');
    expect(rows[0]!.description).toBe('Desc, with comma');
    expect(rows[0]!.speakerHeadshotUrl).toBe('');
  });

  it('throws when a required column is missing', () => {
    const csv = ['title,description', 'foo,bar'].join('\n');
    expect(() => parseCsv(csv)).toThrow(/missing required column/i);
  });

  it('trims whitespace from cell values', () => {
    const csv = [
      HEADER,
      '  Talk A  , A description ,Main Stage,2026-10-12,11:00,11:40,  Jane Doe  ,T,,Acme',
    ].join('\n');

    const rows = parseCsv(csv);
    expect(rows[0]!.title).toBe('Talk A');
    expect(rows[0]!.speakerName).toBe('Jane Doe');
  });
});
