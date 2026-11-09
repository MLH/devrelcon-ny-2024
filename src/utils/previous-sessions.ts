import { SpeakerWithTags } from '../models/speaker';

export interface PreviousSessionItem {
  id: string;
  title: string;
  speakers: string[];
}

export interface PreviousYear {
  year: string;
  sessions: PreviousSessionItem[];
}

/** Groups archived talks from speaker history by year, newest year first. */
export const groupPreviousSessions = (speakers: SpeakerWithTags[]): PreviousYear[] => {
  const years = new Map<string, Map<string, PreviousSessionItem>>();

  for (const speaker of speakers) {
    for (const [year, snapshot] of Object.entries(speaker.history ?? {})) {
      for (const { sessionId, title } of snapshot.talks ?? []) {
        // Talks without a sessionId have no page to link to
        if (!sessionId) continue;
        const sessions = years.get(year) ?? new Map<string, PreviousSessionItem>();
        years.set(year, sessions);
        const session = sessions.get(sessionId) ?? { id: sessionId, title, speakers: [] };
        sessions.set(sessionId, session);
        if (!session.speakers.includes(speaker.name)) session.speakers.push(speaker.name);
      }
    }
  }

  return [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, sessions]) => ({
      year,
      sessions: [...sessions.values()].sort((a, b) => a.title.localeCompare(b.title)),
    }));
};
