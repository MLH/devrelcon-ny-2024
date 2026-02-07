/**
 * One-time migration: copy previousSpeakers data into the unified speakers collection.
 *
 * Usage:
 *   npx ts-node-script scripts/migrate-previous-speakers
 *   npx ts-node-script scripts/migrate-previous-speakers --dry-run
 */

import { firestore } from '../firebase-config';

interface PreviousSession {
  title: string;
  tags?: string[];
  presentation?: string;
  videoId?: string;
}

interface YearSnapshot {
  bio: string;
  company: string;
  title: string;
  talks: PreviousSession[];
}

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.includes('--dry-run') };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  const { dryRun } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Fetch both collections
  console.log('Fetching previousSpeakers...');
  const prevSnapshot = await firestore.collection('previousSpeakers').get();
  console.log(`  Found ${prevSnapshot.size} previous speakers`);

  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  const speakersById = new Map<string, FirebaseFirestore.DocumentData>();
  speakersSnapshot.forEach((doc) => speakersById.set(doc.id, doc.data()));
  console.log(`  Found ${speakersById.size} current speakers`);

  // 2. Process each previous speaker
  let mergeCount = 0;
  let newCount = 0;
  const batch = firestore.batch();
  let batchOps = 0;

  prevSnapshot.forEach((doc) => {
    const prev = doc.data();
    const prevId = doc.id;
    const slug = toSlug(prev['name'] || '');

    // Check for existing speaker match
    const existingSpeaker = speakersById.get(prevId) ?? speakersById.get(slug);
    const targetId = speakersById.has(prevId)
      ? prevId
      : speakersById.has(slug)
        ? slug
        : prevId;

    // Convert previousSpeakers sessions format { [year]: PreviousSession[] }
    // to history format { [year]: YearSnapshot }
    const oldSessions = (prev['sessions'] || {}) as Record<string, PreviousSession[]>;
    const history: Record<string, YearSnapshot> = {};

    for (const [year, talks] of Object.entries(oldSessions)) {
      history[year] = {
        bio: prev['bio'] || '',
        company: prev['company'] || '',
        title: prev['title'] || '',
        talks: talks.map((t) => ({
          title: t.title,
          tags: t.tags || [],
          ...(t.presentation ? { presentation: t.presentation } : {}),
          ...(t.videoId ? { videoId: t.videoId } : {}),
        })),
      };
    }

    if (existingSpeaker) {
      // Merge: add history to existing speaker
      const existingHistory = (existingSpeaker['history'] || {}) as Record<string, YearSnapshot>;
      const mergedHistory = { ...existingHistory, ...history };

      console.log(
        `  [merge] ${prev['name']} → speakers/${targetId} (${Object.keys(history).length} year(s))`
      );
      if (!dryRun) {
        batch.update(firestore.collection('speakers').doc(targetId), {
          history: mergedHistory,
        });
        batchOps++;
      }
      mergeCount++;
    } else {
      // New: create speaker doc with active=false
      const newDoc: Record<string, unknown> = {
        active: false,
        badges: [],
        bio: prev['bio'] || '',
        company: prev['company'] || '',
        companyLogo: prev['companyLogo'] || '',
        companyLogoUrl: prev['companyLogo'] || '',
        country: prev['country'] || '',
        featured: false,
        history,
        name: prev['name'] || '',
        order: prev['order'] || 0,
        photo: '',
        photoUrl: prev['photoUrl'] || '',
        shortBio: '',
        socials: prev['socials'] || [],
        title: prev['title'] || '',
      };

      console.log(
        `  [new]   ${prev['name']} → speakers/${targetId} (${Object.keys(history).length} year(s))`
      );
      if (!dryRun) {
        batch.set(firestore.collection('speakers').doc(targetId), newDoc);
        batchOps++;
      }
      newCount++;
    }
  });

  console.log(`\nSummary: ${mergeCount} merged, ${newCount} new`);

  if (!dryRun && batchOps > 0) {
    console.log(`\nCommitting ${batchOps} operations...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log('\n[dry-run] No changes written.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
