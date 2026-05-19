import type { CsvRow } from './csv';

export interface TalkSpeaker {
  name: string;
  title: string;
  headshotUrl: string;
  company: string;
}

export interface Talk {
  title: string;
  description: string;
  stage: string;
  day: string;
  startTime: string;
  endTime: string;
  speakers: TalkSpeaker[];
  originalIndex: number;
}

export interface GroupResult {
  talks: Talk[];
  warnings: string[];
}

function talkKey(r: CsvRow): string {
  return `${r.day}|${r.stage}|${r.startTime}|${r.endTime}|${r.title}`;
}

export function groupTalks(rows: CsvRow[]): GroupResult {
  const byKey = new Map<string, Talk>();
  const warnings: string[] = [];

  rows.forEach((r, idx) => {
    const key = talkKey(r);
    const existing = byKey.get(key);
    const speaker: TalkSpeaker = {
      name: r.speakerName,
      title: r.speakerTitle,
      headshotUrl: r.speakerHeadshotUrl,
      company: r.speakerCompany,
    };

    if (existing) {
      if (existing.description !== r.description) {
        warnings.push(
          `Description mismatch for talk "${r.title}" on ${r.day} ${r.startTime} — keeping first row's value (row ${existing.originalIndex + 1})`,
        );
      }
      existing.speakers.push(speaker);
    } else {
      byKey.set(key, {
        title: r.title,
        description: r.description,
        stage: r.stage,
        day: r.day,
        startTime: r.startTime,
        endTime: r.endTime,
        speakers: [speaker],
        originalIndex: idx,
      });
    }
  });

  const talks = Array.from(byKey.values()).sort((a, b) => a.originalIndex - b.originalIndex);
  return { talks, warnings };
}
