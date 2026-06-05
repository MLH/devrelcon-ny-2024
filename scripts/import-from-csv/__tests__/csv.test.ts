import { describe, expect, it, jest } from '@jest/globals';
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

  it('normalizes times with seconds and single-digit hours to HH:MM', () => {
    const csv = [
      HEADER,
      'Talk A,D,Main Stage,2026-10-12,9:00:00,9:07:00,Jane Doe,T,,Acme',
      'Talk B,D,Main Stage,2026-10-12,11:30:00,11:55:00,Jo Smith,T,,Acme',
      'Talk C,D,Main Stage,2026-10-12,10:00,10:25,Al Jones,T,,Acme',
    ].join('\n');

    const rows = parseCsv(csv);
    expect(rows.map((r) => [r.startTime, r.endTime])).toEqual([
      ['09:00', '09:07'],
      ['11:30', '11:55'],
      ['10:00', '10:25'],
    ]);
  });

  it('skips rows not marked TRUE when a "Ready for Website?" column is present', () => {
    const csv = [
      `Ready for Website?,${HEADER}`,
      'TRUE,Talk A,D,Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,,Acme',
      'FALSE,Talk B,D,Main Stage,2026-10-12,12:00,12:40,Jo Smith,T,,Acme',
      ',Talk C,D,Main Stage,2026-10-12,13:00,13:40,Al Jones,T,,Acme',
    ].join('\n');

    const rows = parseCsv(csv);
    expect(rows.map((r) => r.title)).toEqual(['Talk A']);
  });

  it('keeps all rows when no "Ready for Website?" column is present', () => {
    const csv = [HEADER, 'Talk A,D,Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,,Acme'].join('\n');

    expect(parseCsv(csv)).toHaveLength(1);
  });

  it('converts Google Drive file links to direct-download URLs', () => {
    const csv = [
      HEADER,
      'Talk A,D,Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,https://drive.google.com/file/d/1FhF_WbTXHrXLbtCD54fMSHnQ0cC_B7vd/view?usp=drive_web,Acme',
    ].join('\n');

    expect(parseCsv(csv)[0]!.speakerHeadshotUrl).toBe(
      'https://drive.google.com/uc?export=download&id=1FhF_WbTXHrXLbtCD54fMSHnQ0cC_B7vd',
    );
  });

  it('blanks Google Drive folder links with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const csv = [
      HEADER,
      'Talk A,D,Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,https://drive.google.com/drive/folders/16rfs8yAJIpDU88QZWH_XhT9clbPt1AtF,Acme',
    ].join('\n');

    expect(parseCsv(csv)[0]!.speakerHeadshotUrl).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('folder'));
    warn.mockRestore();
  });

  it('leaves non-Drive URLs untouched', () => {
    const csv = [
      HEADER,
      'Talk A,D,Main Stage,2026-10-12,11:00,11:40,Jane Doe,T,https://example.com/jane.jpg,Acme',
    ].join('\n');

    expect(parseCsv(csv)[0]!.speakerHeadshotUrl).toBe('https://example.com/jane.jpg');
  });
});
