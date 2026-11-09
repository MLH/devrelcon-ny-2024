import { describe, expect, it } from '@jest/globals';
import { SpeakerWithTags } from '../models/speaker';
import { groupPreviousSessions } from './previous-sessions';

const speaker = (name: string, history: object) => ({ name, history }) as SpeakerWithTags;
const year = (...talks: object[]) => ({ bio: '', company: '', title: '', talks });

describe('groupPreviousSessions', () => {
  it('groups by year, merges co-speakers, and skips talks without a session', () => {
    const result = groupPreviousSessions([
      speaker('Ada', {
        '2024': year({ sessionId: '1', title: 'Beta', tags: [] }),
        '2025': year({ sessionId: '2', title: 'Zed', tags: [] }),
        '2019': year({ title: 'No page', tags: [] }),
      }),
      speaker('Grace', {
        '2025': year(
          { sessionId: '2', title: 'Zed', tags: [] },
          { sessionId: '3', title: 'Alpha', tags: [] },
        ),
      }),
      { name: 'New speaker' } as SpeakerWithTags,
    ]);

    expect(result).toEqual([
      {
        year: '2025',
        sessions: [
          { id: '3', title: 'Alpha', speakers: ['Grace'] },
          { id: '2', title: 'Zed', speakers: ['Ada', 'Grace'] },
        ],
      },
      { year: '2024', sessions: [{ id: '1', title: 'Beta', speakers: ['Ada'] }] },
    ]);
  });
});
