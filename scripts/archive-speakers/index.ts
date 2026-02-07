/**
 * Archive active speakers into their history, then deactivate them.
 *
 * Usage:
 *   npx ts-node-script scripts/archive-speakers --year 2025
 *   npx ts-node-script scripts/archive-speakers --year 2025 --dry-run
 *   npx ts-node-script scripts/archive-speakers --year 2025 --clear
 *
 * Flags:
 *   --year <YYYY>   (required) The conference year to archive under
 *   --dry-run       Preview without writing
 *   --clear         Also delete sessions and schedule collections after archiving
 */

import { firestore } from '../firebase-config';

interface SessionDoc {
  description: string;
  presentation?: string;
  speakers?: string[];
  tags?: string[];
  title: string;
  videoId?: string;
  [key: string]: unknown;
}

interface YearSnapshot {
  bio: string;
  company: string;
  title: string;
  talks: Array<{
    title: string;
    tags: string[];
    presentation?: string;
    videoId?: string;
  }>;
}

function parseArgs(): { year: string; dryRun: boolean; clear: boolean } {
  const args = process.argv.slice(2);
  let year = '';
  let dryRun = false;
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--year' && args[i + 1]) {
      year = args[i + 1]!;
      i++;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--clear') {
      clear = true;
    }
  }

  if (!year || !/^\d{4}$/.test(year)) {
    console.error(
      'Usage: npx ts-node-script scripts/archive-speakers --year <YYYY> [--dry-run] [--clear]'
    );
    process.exit(1);
  }

  return { year, dryRun, clear };
}

async function deleteCollection(collectionPath: string, dryRun: boolean): Promise<number> {
  const snapshot = await firestore.collection(collectionPath).get();
  if (snapshot.empty) return 0;

  if (dryRun) {
    console.log(`  Would delete ${snapshot.size} docs from ${collectionPath}`);
    return snapshot.size;
  }

  const batchSize = 500;
  let deleted = 0;
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = firestore.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }
  console.log(`  Deleted ${deleted} docs from ${collectionPath}`);
  return deleted;
}

async function main() {
  const { year, dryRun, clear } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Fetch active speakers and sessions
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  const activeSpeakers: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = [];
  speakersSnapshot.forEach((doc) => {
    if (doc.data()['active']) {
      activeSpeakers.push({ id: doc.id, data: doc.data() });
    }
  });
  console.log(`  Found ${activeSpeakers.length} active speakers (${speakersSnapshot.size} total)`);

  if (activeSpeakers.length === 0) {
    console.log('\nNo active speakers to archive. Exiting.');
    process.exit(0);
  }

  // 2. Walk the schedule to find session IDs for this year only
  console.log('Fetching schedule...');
  const scheduleSnapshot = await firestore.collection('schedule').get();
  const scheduledSessionIds = new Set<string>();
  scheduleSnapshot.forEach((doc) => {
    const timeslots = doc.data()['timeslots'] as Array<{ sessions: Array<{ items: string[] }> }> | undefined;
    if (!timeslots) return;
    for (const slot of timeslots) {
      if (!slot.sessions) continue;
      for (const session of slot.sessions) {
        if (!session.items) continue;
        for (const sessionId of session.items) {
          scheduledSessionIds.add(sessionId);
        }
      }
    }
  });
  console.log(`  Found ${scheduleSnapshot.size} schedule days, ${scheduledSessionIds.size} scheduled sessions`);

  // 3. Fetch only scheduled sessions and build speaker -> sessions map
  console.log('Fetching scheduled sessions...');
  const speakerSessions = new Map<string, SessionDoc[]>();
  for (const sessionId of scheduledSessionIds) {
    const sessionDoc = await firestore.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) continue;
    const session = sessionDoc.data() as SessionDoc;
    if (!session.speakers) continue;
    for (const speakerId of session.speakers) {
      const existing = speakerSessions.get(speakerId) ?? [];
      existing.push(session);
      speakerSessions.set(speakerId, existing);
    }
  }
  console.log(`  ${speakerSessions.size} speakers with scheduled talks`);

  // 4. Archive each active speaker
  console.log(`\nArchiving ${activeSpeakers.length} speakers under year "${year}":\n`);
  const batch = firestore.batch();
  let ops = 0;

  for (const { id, data } of activeSpeakers) {
    const talks = (speakerSessions.get(id) ?? []).map((s) => {
      const talk: { title: string; tags: string[]; presentation?: string; videoId?: string } = {
        title: s.title,
        tags: s.tags ?? [],
      };
      if (s.presentation) talk.presentation = s.presentation;
      if (s.videoId) talk.videoId = s.videoId;
      return talk;
    });

    const snapshot: YearSnapshot = {
      bio: data['bio'] || '',
      company: data['company'] || '',
      title: data['title'] || '',
      talks,
    };

    const existingHistory = (data['history'] || {}) as Record<string, YearSnapshot>;
    const updatedHistory = { ...existingHistory, [year]: snapshot };

    console.log(`  ${data['name']} — ${talks.length} talk(s)`);

    if (!dryRun) {
      batch.update(firestore.collection('speakers').doc(id), {
        active: false,
        featured: false,
        history: updatedHistory,
      });
      ops++;
    }
  }

  if (!dryRun && ops > 0) {
    console.log(`\nCommitting ${ops} updates...`);
    await batch.commit();
    console.log('Speakers archived.');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would update ${activeSpeakers.length} speaker docs.`);
  }

  // 4. Optionally clear sessions and schedule
  if (clear) {
    console.log('\nClearing collections...');
    await deleteCollection('sessions', dryRun);
    await deleteCollection('schedule', dryRun);
    console.log('Done clearing.');
  }

  console.log('\nArchive complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Archive failed:', err);
  process.exit(1);
});
