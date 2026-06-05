import { describe, expect, it } from '@jest/globals';
import { planSpeakers, type ExistingSpeaker, type CsvSpeaker } from '../speakers';

const baseExisting: ExistingSpeaker = {
  id: 'jane_doe',
  data: {
    name: 'Jane Doe',
    title: 'Old Title',
    company: 'OldCorp',
    bio: 'long bio',
    photo: '/images/people/jane.jpg',
    photoUrl: 'https://existing/jane.jpg',
    active: false,
    featured: false,
    history: { '2025': { bio: 'b', company: 'c', title: 't', talks: [] } },
    order: 5,
  },
};

describe('planSpeakers', () => {
  it('updates an existing speaker found by ID-slug, preserving bio and history', () => {
    const csvSpeakers: CsvSpeaker[] = [
      {
        name: 'Jane Doe',
        title: 'New Title',
        company: 'NewCorp',
        headshotUrl: 'https://new/jane.jpg',
      },
    ];
    const plan = planSpeakers(csvSpeakers, [baseExisting]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates[0]!.id).toBe('jane_doe');
    expect(plan.updates[0]!.fields).toEqual({
      active: true,
      title: 'New Title',
      company: 'NewCorp',
      photo: 'https://new/jane.jpg',
      photoUrl: 'https://new/jane.jpg',
    });
  });

  it('skips photo overwrite when CSV headshot is blank', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Jane Doe', title: 'New Title', company: 'NewCorp', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, [baseExisting]);
    expect(plan.updates[0]!.fields).toEqual({
      active: true,
      title: 'New Title',
      company: 'NewCorp',
    });
    expect(plan.updates[0]!.fields).not.toHaveProperty('photo');
    expect(plan.updates[0]!.fields).not.toHaveProperty('photoUrl');
  });

  it('creates a new speaker doc when no match exists', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Alex Roe', title: 'Engineer', company: 'NewCo', headshotUrl: 'https://x/a.jpg' },
    ];
    const plan = planSpeakers(csvSpeakers, [baseExisting]);
    expect(plan.creates).toHaveLength(1);
    const created = plan.creates[0]!;
    expect(created.id).toBe('alex_roe');
    expect(created.doc).toMatchObject({
      name: 'Alex Roe',
      title: 'Engineer',
      company: 'NewCo',
      photo: 'https://x/a.jpg',
      photoUrl: 'https://x/a.jpg',
      active: true,
      featured: false,
      badges: [],
      bio: '',
      country: '',
      shortBio: '',
      socials: [],
      companyLogo: '',
      companyLogoUrl: '',
    });
    expect(created.doc.order).toBe(6); // max existing order + 1
  });

  it('assigns sequential order values to multiple new speakers', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Alex Roe', title: 'E', company: 'N', headshotUrl: '' },
      { name: 'Bob Coe', title: 'E', company: 'N', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, [baseExisting]);
    expect(plan.creates[0]!.doc.order).toBe(6);
    expect(plan.creates[1]!.doc.order).toBe(7);
  });

  it('starts new-speaker order from 0 when no existing speakers', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Alex Roe', title: 'E', company: 'N', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, []);
    expect(plan.creates[0]!.doc.order).toBe(0);
  });

  it('matches existing speaker by name-slug when ID differs', () => {
    const existing: ExistingSpeaker = {
      id: 'jdoe_legacy',
      data: { ...baseExisting.data, name: 'Jane Doe' },
    };
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Jane Doe', title: 'X', company: 'Y', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, [existing]);
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]!.id).toBe('jdoe_legacy');
  });

  it('aborts when a name resolves to two different existing speakers', () => {
    const a: ExistingSpeaker = { id: 'jane_doe', data: { ...baseExisting.data, name: 'Jane Doe' } };
    const b: ExistingSpeaker = {
      id: 'jane_doe_b',
      data: { ...baseExisting.data, name: 'Jane  Doe' },
    };
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Jane Doe', title: 'X', company: 'Y', headshotUrl: '' },
    ];
    expect(() => planSpeakers(csvSpeakers, [a, b])).toThrow(/ambiguous/i);
  });

  it('returns a name→speakerId resolution map covering every CSV speaker', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Jane Doe', title: 'X', company: 'Y', headshotUrl: '' },
      { name: 'Alex Roe', title: 'X', company: 'Y', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, [baseExisting]);
    expect(plan.resolveByName.get('Jane Doe')).toBe('jane_doe');
    expect(plan.resolveByName.get('Alex Roe')).toBe('alex_roe');
  });

  it('deduplicates the same speaker name appearing on multiple talks', () => {
    const csvSpeakers: CsvSpeaker[] = [
      { name: 'Alex Roe', title: 'A', company: 'A', headshotUrl: '' },
      { name: 'Alex Roe', title: 'A', company: 'A', headshotUrl: '' },
    ];
    const plan = planSpeakers(csvSpeakers, []);
    expect(plan.creates).toHaveLength(1);
  });
});

describe('planSpeakers photo preservation', () => {
  it('does not overwrite an already-hosted Storage photo', () => {
    const existing = [
      {
        id: 'jane_doe',
        data: {
          name: 'Jane Doe',
          order: 0,
          photoUrl:
            'https://storage.googleapis.com/devrelcon-ny-2024.appspot.com/admin-uploads/speakers/photos/jane_doe.jpg',
        },
      },
    ];
    const plan = planSpeakers(
      [
        {
          name: 'Jane Doe',
          title: 'T',
          company: 'Acme',
          headshotUrl: 'https://drive.google.com/uc?id=x',
        },
      ],
      existing,
    );
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]!.fields).not.toHaveProperty('photoUrl');
    expect(plan.updates[0]!.fields).not.toHaveProperty('photo');
  });

  it('still sets the photo when the existing one is not hosted', () => {
    const existing = [
      {
        id: 'jane_doe',
        data: { name: 'Jane Doe', order: 0, photoUrl: 'https://example.com/old.jpg' },
      },
    ];
    const plan = planSpeakers(
      [
        {
          name: 'Jane Doe',
          title: 'T',
          company: 'Acme',
          headshotUrl: 'https://drive.google.com/uc?id=x',
        },
      ],
      existing,
    );
    expect(plan.updates[0]!.fields['photoUrl']).toBe('https://drive.google.com/uc?id=x');
  });
});
