import { describe, expect, it } from '@jest/globals';
import { buildSchedule, type ScheduleInput } from '../schedule';
import type { Talk } from '../grouping';

function talk(overrides: Partial<Talk> = {}): Talk {
  return {
    title: 'Talk',
    description: 'desc',
    stage: 'Main',
    day: '2026-10-12',
    startTime: '11:00',
    endTime: '11:40',
    speakers: [],
    originalIndex: 0,
    ...overrides,
  };
}

describe('buildSchedule', () => {
  it('builds a single-stage, single-timeslot day', () => {
    const t = talk();
    const input: ScheduleInput = {
      talks: [t],
      talkToSessionId: new Map([[t, '101']]),
    };
    const days = buildSchedule(input);
    expect(days).toEqual([
      {
        date: '2026-10-12',
        dateReadable: 'October 12',
        timeslots: [
          {
            startTime: '11:00',
            endTime: '11:40',
            sessions: [{ items: ['101'] }],
          },
        ],
        tracks: [{ title: 'Main' }],
      },
    ]);
  });

  it('orders stages by first appearance in CSV (originalIndex order)', () => {
    const t1 = talk({ stage: 'Side', originalIndex: 0 });
    const t2 = talk({ stage: 'Main', originalIndex: 1, startTime: '11:00', endTime: '11:40' });
    const input: ScheduleInput = {
      talks: [t1, t2],
      talkToSessionId: new Map([
        [t1, '101'],
        [t2, '102'],
      ]),
    };
    const days = buildSchedule(input);
    expect(days[0]!.timeslots[0]!.sessions).toEqual([
      { items: ['101'] }, // Side appeared first
      { items: ['102'] },
    ]);
  });

  it('emits {items: []} for stages with no talk in a timeslot', () => {
    const t1 = talk({ stage: 'Main', startTime: '11:00', endTime: '11:40', originalIndex: 0 });
    const t2 = talk({ stage: 'Side', startTime: '12:00', endTime: '12:40', originalIndex: 1 });
    const input: ScheduleInput = {
      talks: [t1, t2],
      talkToSessionId: new Map([
        [t1, '101'],
        [t2, '102'],
      ]),
    };
    const days = buildSchedule(input);
    expect(days[0]!.timeslots).toEqual([
      { startTime: '11:00', endTime: '11:40', sessions: [{ items: ['101'] }, { items: [] }] },
      { startTime: '12:00', endTime: '12:40', sessions: [{ items: [] }, { items: ['102'] }] },
    ]);
  });

  it('auto-extends a long talk across atomic timeslots created by another stage', () => {
    const long = talk({ stage: 'Main', startTime: '11:00', endTime: '11:40', originalIndex: 0 });
    const short1 = talk({ stage: 'Side', startTime: '11:00', endTime: '11:20', originalIndex: 1 });
    const short2 = talk({ stage: 'Side', startTime: '11:20', endTime: '11:40', originalIndex: 2 });
    const input: ScheduleInput = {
      talks: [long, short1, short2],
      talkToSessionId: new Map([
        [long, '101'],
        [short1, '102'],
        [short2, '103'],
      ]),
    };
    const days = buildSchedule(input);
    expect(days[0]!.timeslots).toEqual([
      {
        startTime: '11:00',
        endTime: '11:20',
        sessions: [{ items: ['101'], extend: 2 }, { items: ['102'] }],
      },
      {
        startTime: '11:20',
        endTime: '11:40',
        sessions: [{ items: [] }, { items: ['103'] }],
      },
    ]);
  });

  it('groups talks across multiple days', () => {
    const day1 = talk({ day: '2026-10-12', originalIndex: 0 });
    const day2 = talk({ day: '2026-10-13', originalIndex: 1 });
    const input: ScheduleInput = {
      talks: [day1, day2],
      talkToSessionId: new Map([
        [day1, '101'],
        [day2, '102'],
      ]),
    };
    const days = buildSchedule(input);
    expect(days.map((d) => d.date)).toEqual(['2026-10-12', '2026-10-13']);
    expect(days[1]!.dateReadable).toBe('October 13');
  });

  it('aborts when two talks on the same stage overlap', () => {
    const a = talk({ stage: 'Main', startTime: '11:00', endTime: '12:00', originalIndex: 0 });
    const b = talk({ stage: 'Main', startTime: '11:30', endTime: '12:30', originalIndex: 1 });
    const input: ScheduleInput = {
      talks: [a, b],
      talkToSessionId: new Map([
        [a, '101'],
        [b, '102'],
      ]),
    };
    expect(() => buildSchedule(input)).toThrow(/overlap/i);
  });

  it('aborts when endTime <= startTime', () => {
    const t = talk({ startTime: '11:00', endTime: '11:00' });
    const input: ScheduleInput = {
      talks: [t],
      talkToSessionId: new Map([[t, '101']]),
    };
    expect(() => buildSchedule(input)).toThrow(/endTime.*startTime/i);
  });

  it('handles asymmetric stage grids with a gap on one stage', () => {
    // Stage A: one 60-min talk. Stage B: two 30-min talks with a gap in between.
    const a = talk({ stage: 'A', startTime: '11:00', endTime: '12:00', originalIndex: 0 });
    const b1 = talk({ stage: 'B', startTime: '11:00', endTime: '11:30', originalIndex: 1 });
    const b2 = talk({ stage: 'B', startTime: '11:45', endTime: '12:00', originalIndex: 2 });
    const input: ScheduleInput = {
      talks: [a, b1, b2],
      talkToSessionId: new Map([
        [a, '101'],
        [b1, '102'],
        [b2, '103'],
      ]),
    };
    const days = buildSchedule(input);
    // Boundaries: 11:00, 11:30, 11:45, 12:00. Three atomic timeslots.
    expect(days[0]!.timeslots).toEqual([
      {
        startTime: '11:00',
        endTime: '11:30',
        sessions: [{ items: ['101'], extend: 3 }, { items: ['102'] }],
      },
      {
        startTime: '11:30',
        endTime: '11:45',
        sessions: [{ items: [] }, { items: [] }],
      },
      {
        startTime: '11:45',
        endTime: '12:00',
        sessions: [{ items: [] }, { items: ['103'] }],
      },
    ]);
  });
});
