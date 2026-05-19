import { groupTalks } from '../grouping';
import type { CsvRow } from '../csv';

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    title: 'Talk A',
    description: 'A desc',
    stage: 'Main Stage',
    day: '2026-10-12',
    startTime: '11:00',
    endTime: '11:40',
    speakerName: 'Jane Doe',
    speakerTitle: 'Head of DevRel',
    speakerHeadshotUrl: '',
    speakerCompany: 'Acme',
    ...overrides,
  };
}

describe('groupTalks', () => {
  it('groups co-speaker rows into one Talk preserving speaker order', () => {
    const rows = [
      row({ speakerName: 'Jane Doe', speakerCompany: 'Acme' }),
      row({ speakerName: 'John Roe', speakerCompany: 'Beta' }),
    ];
    const { talks, warnings } = groupTalks(rows);
    expect(talks).toHaveLength(1);
    expect(talks[0]!.speakers.map((s) => s.name)).toEqual(['Jane Doe', 'John Roe']);
    expect(warnings).toEqual([]);
  });

  it('keeps distinct talks separate', () => {
    const rows = [
      row({ title: 'Talk A' }),
      row({ title: 'Talk B', startTime: '12:00', endTime: '12:40' }),
    ];
    const { talks } = groupTalks(rows);
    expect(talks).toHaveLength(2);
  });

  it('warns when co-speaker rows disagree on description and keeps the first', () => {
    const rows = [
      row({ speakerName: 'Jane Doe', description: 'first desc' }),
      row({ speakerName: 'John Roe', description: 'different desc' }),
    ];
    const { talks, warnings } = groupTalks(rows);
    expect(talks[0]!.description).toBe('first desc');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/description mismatch/i);
  });

  it('preserves original CSV row order on talks (originalIndex)', () => {
    const rows = [
      row({ title: 'Talk B', startTime: '12:00', endTime: '12:40' }),
      row({ title: 'Talk A', startTime: '11:00', endTime: '11:40' }),
    ];
    const { talks } = groupTalks(rows);
    expect(talks.map((t) => t.title)).toEqual(['Talk B', 'Talk A']);
    expect(talks.map((t) => t.originalIndex)).toEqual([0, 1]);
  });
});
