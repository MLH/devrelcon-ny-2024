import { toSlug } from '../utils/slug';

export interface CsvSpeaker {
  name: string;
  title: string;
  company: string;
  headshotUrl: string;
}

export interface ExistingSpeaker {
  id: string;
  data: Record<string, unknown> & { name?: string; order?: number };
}

export interface UpdateOp {
  id: string;
  fields: Record<string, unknown>;
}

export interface CreateOp {
  id: string;
  doc: {
    name: string;
    title: string;
    company: string;
    photo: string;
    photoUrl: string;
    active: true;
    featured: false;
    badges: never[];
    bio: '';
    country: '';
    shortBio: '';
    socials: never[];
    companyLogo: '';
    companyLogoUrl: '';
    order: number;
  };
}

export interface SpeakerPlan {
  updates: UpdateOp[];
  creates: CreateOp[];
  resolveByName: Map<string, string>;
}

export function planSpeakers(csvSpeakers: CsvSpeaker[], existing: ExistingSpeaker[]): SpeakerPlan {
  const byId = new Map<string, ExistingSpeaker>();
  const bySlug = new Map<string, ExistingSpeaker[]>();
  for (const s of existing) {
    byId.set(s.id, s);
    const slug = toSlug(String(s.data.name ?? ''));
    if (!slug) continue;
    const bucket = bySlug.get(slug) ?? [];
    bucket.push(s);
    bySlug.set(slug, bucket);
  }

  const seen = new Map<string, CsvSpeaker>();
  for (const sp of csvSpeakers) {
    if (!seen.has(sp.name)) seen.set(sp.name, sp);
  }

  const maxExistingOrder = existing.reduce(
    (m, s) => Math.max(m, typeof s.data.order === 'number' ? s.data.order : -1),
    -1,
  );
  let nextOrder = maxExistingOrder + 1;

  const updates: UpdateOp[] = [];
  const creates: CreateOp[] = [];
  const resolveByName = new Map<string, string>();

  for (const csv of seen.values()) {
    const slug = toSlug(csv.name);
    const byIdMatch = byId.get(slug);
    const bySlugMatches = bySlug.get(slug) ?? [];

    let match: ExistingSpeaker | undefined;
    if (bySlugMatches.length > 1) {
      const ids = bySlugMatches.map((m) => m.id).join(', ');
      throw new Error(
        `Ambiguous existing speaker for CSV name "${csv.name}" (slug "${slug}") — found ${bySlugMatches.length} candidates: ${ids}`,
      );
    } else if (byIdMatch) {
      match = byIdMatch;
    } else if (bySlugMatches.length === 1) {
      match = bySlugMatches[0];
    }

    if (match) {
      const fields: Record<string, unknown> = {
        active: true,
        title: csv.title,
        company: csv.company,
      };
      // Don't clobber a photo that's already rehosted on our Storage —
      // the CSV value is the original (often non-public Drive) source.
      const existingPhoto = String(match.data['photoUrl'] ?? '');
      const alreadyHosted = existingPhoto.includes('storage.googleapis.com/devrelcon-ny-2024');
      if (csv.headshotUrl && !alreadyHosted) {
        fields['photo'] = csv.headshotUrl;
        fields['photoUrl'] = csv.headshotUrl;
      }
      updates.push({ id: match.id, fields });
      resolveByName.set(csv.name, match.id);
    } else {
      const photo = csv.headshotUrl || '';
      const create: CreateOp = {
        id: slug,
        doc: {
          name: csv.name,
          title: csv.title,
          company: csv.company,
          photo,
          photoUrl: photo,
          active: true,
          featured: false,
          badges: [],
          bio: '',
          country: '',
          shortBio: '',
          socials: [],
          companyLogo: '',
          companyLogoUrl: '',
          order: nextOrder++,
        },
      };
      creates.push(create);
      resolveByName.set(csv.name, slug);
    }
  }

  return { updates, creates, resolveByName };
}
