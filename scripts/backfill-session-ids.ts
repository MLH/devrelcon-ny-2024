/**
 * Backfill sessionId into speaker history talks by matching talk title + speaker ID
 * against the sessions collection.
 *
 * Usage:
 *   npx ts-node-script scripts/backfill-session-ids --dry-run
 *   npx ts-node-script scripts/backfill-session-ids
 */

import { firestore } from './firebase-config';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Build a lookup: (speakerId, talkTitle) -> sessionId
  console.log('Fetching sessions...');
  const sessionsSnapshot = await firestore.collection('sessions').get();
  console.log(`  Found ${sessionsSnapshot.size} sessions`);

  // Map from "speakerId::talkTitle" (lowercased) to session doc ID
  const talkIndex = new Map<string, string>();
  sessionsSnapshot.forEach((doc) => {
    const data = doc.data();
    const title = (data['title'] as string) || '';
    const speakers = (data['speakers'] as string[]) || [];
    for (const speakerId of speakers) {
      const key = `${speakerId.toLowerCase()}::${title.toLowerCase()}`;
      talkIndex.set(key, doc.id);
    }
  });
  console.log(`  Built index with ${talkIndex.size} entries\n`);

  // 2. Walk speakers and backfill session IDs
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  console.log(`  Found ${speakersSnapshot.size} speakers\n`);

  const batch = firestore.batch();
  let updated = 0;
  let matched = 0;
  let unmatched = 0;

  for (const doc of speakersSnapshot.docs) {
    const data = doc.data();
    const history = data['history'] as Record<string, { bio: string; company: string; title: string; talks: Array<{ title: string; sessionId?: string; tags?: string[]; presentation?: string; videoId?: string }> }> | undefined;
    if (!history) continue;

    let docChanged = false;

    for (const [year, snapshot] of Object.entries(history)) {
      if (!snapshot.talks) continue;

      for (const talk of snapshot.talks) {
        if (talk.sessionId) continue; // Already has a session ID

        const key = `${doc.id.toLowerCase()}::${talk.title.toLowerCase()}`;
        const sessionId = talkIndex.get(key);

        if (sessionId) {
          talk.sessionId = sessionId;
          docChanged = true;
          matched++;
          console.log(`  [match]   ${data['name']} / ${year} / "${talk.title}" → ${sessionId}`);
        } else {
          unmatched++;
          console.log(`  [no match] ${data['name']} / ${year} / "${talk.title}"`);
        }
      }
    }

    if (docChanged) {
      if (!dryRun) {
        batch.update(doc.ref, { history });
      }
      updated++;
    }
  }

  console.log(`\nSummary: ${matched} matched, ${unmatched} unmatched, ${updated} speakers to update`);

  if (!dryRun && updated > 0) {
    console.log(`\nCommitting ${updated} updates...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would update ${updated} speakers.`);
  } else {
    console.log('\nNo changes needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
