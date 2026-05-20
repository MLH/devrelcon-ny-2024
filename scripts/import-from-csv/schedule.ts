import type { Talk } from './grouping';

export interface TimeslotStageEntry {
  items: string[];
  extend?: number;
}

export interface Timeslot {
  startTime: string;
  endTime: string;
  sessions: TimeslotStageEntry[];
}

export interface ScheduleDay {
  date: string;
  dateReadable: string;
  timeslots: Timeslot[];
}

export interface ScheduleInput {
  talks: Talk[];
  talkToSessionId: Map<Talk, string>;
}

function timeToMinutes(t: string): number {
  const parts = t.split(':').map((n) => parseInt(n, 10));
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid time "${t}"`);
  }
  return h * 60 + m;
}

function dateReadable(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function buildSchedule(input: ScheduleInput): ScheduleDay[] {
  // Validate per-talk times.
  for (const t of input.talks) {
    if (timeToMinutes(t.endTime) <= timeToMinutes(t.startTime)) {
      throw new Error(
        `Talk "${t.title}" on ${t.day} has endTime (${t.endTime}) <= startTime (${t.startTime})`,
      );
    }
  }

  // Group by day.
  const byDay = new Map<string, Talk[]>();
  for (const t of input.talks) {
    const bucket = byDay.get(t.day) ?? [];
    bucket.push(t);
    byDay.set(t.day, bucket);
  }

  const days: ScheduleDay[] = [];

  for (const date of Array.from(byDay.keys()).sort()) {
    const dayTalks = byDay.get(date)!;

    // Per-stage overlap check.
    const byStage = new Map<string, Talk[]>();
    for (const t of dayTalks) {
      const bucket = byStage.get(t.stage) ?? [];
      bucket.push(t);
      byStage.set(t.stage, bucket);
    }
    for (const [stage, talks] of byStage) {
      const sorted = [...talks].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      );
      for (let i = 1; i < sorted.length; i++) {
        if (timeToMinutes(sorted[i]!.startTime) < timeToMinutes(sorted[i - 1]!.endTime)) {
          throw new Error(
            `Talks overlap on stage "${stage}" on ${date}: "${sorted[i - 1]!.title}" and "${sorted[i]!.title}"`,
          );
        }
      }
    }

    // Stage order: first appearance in CSV (lowest originalIndex).
    const stageFirstIndex = new Map<string, number>();
    for (const t of dayTalks) {
      if (!stageFirstIndex.has(t.stage) || stageFirstIndex.get(t.stage)! > t.originalIndex) {
        stageFirstIndex.set(t.stage, t.originalIndex);
      }
    }
    const stages = Array.from(stageFirstIndex.keys()).sort(
      (a, b) => stageFirstIndex.get(a)! - stageFirstIndex.get(b)!,
    );

    // Atomic time boundaries.
    const boundarySet = new Set<number>();
    for (const t of dayTalks) {
      boundarySet.add(timeToMinutes(t.startTime));
      boundarySet.add(timeToMinutes(t.endTime));
    }
    const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

    const minutesToString = (m: number): string => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    // Defensive alignment check (every start/end was added so this can't fail by construction;
    // sanity check guards against future bugs).
    for (const t of dayTalks) {
      if (!boundarySet.has(timeToMinutes(t.startTime))) {
        throw new Error(
          `Talk "${t.title}" on ${date} startTime ${t.startTime} does not align with an atomic timeslot boundary`,
        );
      }
      if (!boundarySet.has(timeToMinutes(t.endTime))) {
        throw new Error(
          `Talk "${t.title}" on ${date} endTime ${t.endTime} does not align with an atomic timeslot boundary`,
        );
      }
    }

    const timeslots: Timeslot[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const t0 = boundaries[i]!;
      const t1 = boundaries[i + 1]!;

      // Drop atomic timeslots with no active coverage from any stage (global gap).
      // A slot is "covered" if some talk overlaps [t0, t1) — i.e., starts <= t0 and ends >= t1.
      const covered = dayTalks.some(
        (t) => timeToMinutes(t.startTime) <= t0 && timeToMinutes(t.endTime) >= t1,
      );
      if (!covered) continue;

      const sessions: TimeslotStageEntry[] = stages.map((stage) => {
        const stageTalks = byStage.get(stage) ?? [];
        // Talk that starts exactly at t0.
        const starting = stageTalks.find((t) => timeToMinutes(t.startTime) === t0);
        if (starting) {
          const startIdx = boundaries.indexOf(timeToMinutes(starting.startTime));
          const endIdx = boundaries.indexOf(timeToMinutes(starting.endTime));
          const span = endIdx - startIdx;
          const sessionId = input.talkToSessionId.get(starting);
          if (!sessionId) {
            throw new Error(
              `Talk "${starting.title}" has no assigned session ID — buildSessions out of sync`,
            );
          }
          const entry: TimeslotStageEntry = { items: [sessionId] };
          if (span > 1) entry.extend = span;
          return entry;
        }
        // Otherwise empty (either gap, or covered by an earlier extend).
        return { items: [] };
      });

      timeslots.push({
        startTime: minutesToString(t0),
        endTime: minutesToString(t1),
        sessions,
      });
    }

    days.push({
      date,
      dateReadable: dateReadable(date),
      timeslots,
    });
  }

  return days;
}
