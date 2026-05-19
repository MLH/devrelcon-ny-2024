import { buildSessions, type SessionsInput } from '../sessions';
import type { Talk } from '../grouping';

function talk(overrides: Partial<Talk> = {}): Talk {
  return {
    title: 'Talk A',
    description: 'desc',
    stage: 'Main Stage',
    day: '2026-10-12',
    startTime: '11:00',
    endTime: '11:40',
    speakers: [{ name: 'Jane Doe', title: 'T', headshotUrl: '', company: 'C' }],
    originalIndex: 0,
    ...overrides,
  };
}

describe('buildSessions', () => {
  const resolveByName = new Map([
    ['Jane Doe', 'jane_doe'],
    ['John Roe', 'john_roe'],
  ]);

  it('assigns sequential IDs starting at 101 when no existing sessions', () => {
    const input: SessionsInput = {
      talks: [talk({ title: 'Talk A' }), talk({ title: 'Talk B', startTime: '12:00' })],
      existingSessionIds: [],
      resolveByName,
    };
    const { sessions, talkToSessionId } = buildSessions(input);
    expect(sessions.map((s) => s.id)).toEqual(['101', '102']);
    expect(talkToSessionId.size).toBe(2);
  });

  it('continues from max numeric existing ID + 1', () => {
    const input: SessionsInput = {
      talks: [talk()],
      existingSessionIds: ['100', '101', '203', 'notnumeric'],
      resolveByName,
    };
    const { sessions } = buildSessions(input);
    expect(sessions[0]!.id).toBe('204');
  });

  it('sorts talks deterministically by (day, startTime, stage, title)', () => {
    const input: SessionsInput = {
      talks: [
        talk({ title: 'B', stage: 'Main', startTime: '12:00', originalIndex: 0 }),
        talk({ title: 'A', stage: 'Main', startTime: '11:00', originalIndex: 1 }),
        talk({ title: 'C', stage: 'Side', startTime: '11:00', originalIndex: 2 }),
        talk({ title: 'D', stage: 'Main', startTime: '11:00', originalIndex: 3 }),
      ],
      existingSessionIds: [],
      resolveByName,
    };
    const { sessions } = buildSessions(input);
    expect(sessions.map((s) => s.doc.title)).toEqual(['A', 'D', 'C', 'B']);
    expect(sessions.map((s) => s.id)).toEqual(['101', '102', '103', '104']);
  });

  it('populates session doc fields', () => {
    const input: SessionsInput = {
      talks: [
        talk({
          title: 'Talk A',
          description: 'desc',
          day: '2026-10-12',
          startTime: '11:00',
          speakers: [
            { name: 'Jane Doe', title: '', headshotUrl: '', company: '' },
            { name: 'John Roe', title: '', headshotUrl: '', company: '' },
          ],
        }),
      ],
      existingSessionIds: [],
      resolveByName,
    };
    const { sessions } = buildSessions(input);
    expect(sessions[0]!.doc).toEqual({
      title: 'Talk A',
      description: 'desc',
      day: '2026-10-12',
      startTime: '11:00',
      speakers: ['jane_doe', 'john_roe'],
      tags: [],
    });
  });

  it('throws when a talk speaker is missing from resolveByName', () => {
    const input: SessionsInput = {
      talks: [talk({ speakers: [{ name: 'Ghost', title: '', headshotUrl: '', company: '' }] })],
      existingSessionIds: [],
      resolveByName,
    };
    expect(() => buildSessions(input)).toThrow(/unresolved speaker/i);
  });
});
