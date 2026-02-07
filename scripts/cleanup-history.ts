/**
 * Clean up history entries for a given year:
 *   - Remove history.<year> from speakers NOT on the schedule
 *   - Rebuild history.<year>.talks for speakers who ARE on the schedule,
 *     using only sessions that appear in the schedule (not all sessions)
 *
 * Usage:
 *   npx ts-node-script scripts/cleanup-history --year 2025 --dry-run
 *   npx ts-node-script scripts/cleanup-history --year 2025
 */

import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from './firebase-config';

function parseArgs(): { year: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let year = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--year' && args[i + 1]) {
      year = args[i + 1]!;
      i++;
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  if (!year || !/^\d{4}$/.test(year)) {
    console.error('Usage: npx ts-node-script scripts/cleanup-history --year <YYYY> [--dry-run]');
    process.exit(1);
  }

  return { year, dryRun };
}

async function main() {
  const { year, dryRun } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Walk the schedule to find session IDs for this year only
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
  console.log(`  Found ${scheduleSnapshot.size} schedule days`);
  console.log(`  ${scheduledSessionIds.size} session IDs on the schedule`);

  // 2. Look up those sessions to build speaker → talks map
  console.log('Fetching scheduled sessions...');
  const scheduledSpeakerIds = new Set<string>();
  const speakerTalks = new Map<string, Array<{ title: string; tags: string[]; presentation?: string; videoId?: string }>>();

  for (const sessionId of scheduledSessionIds) {
    const sessionDoc = await firestore.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) continue;
    const data = sessionDoc.data()!;
    const speakers = data['speakers'] as string[] | undefined;
    if (!speakers) continue;

    const talk: { title: string; tags: string[]; presentation?: string; videoId?: string } = {
      title: data['title'] as string,
      tags: (data['tags'] as string[]) ?? [],
    };
    if (data['presentation']) talk.presentation = data['presentation'] as string;
    if (data['videoId']) talk.videoId = data['videoId'] as string;

    for (const id of speakers) {
      scheduledSpeakerIds.add(id);
      const existing = speakerTalks.get(id) ?? [];
      existing.push(talk);
      speakerTalks.set(id, existing);
    }
  }
  console.log(`  ${scheduledSpeakerIds.size} unique speaker IDs on the ${year} schedule\n`);

  // 3. Fix speakers: remove bogus history or rebuild talks from schedule only
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  console.log(`  Found ${speakersSnapshot.size} speakers\n`);

  const batch = firestore.batch();
  let removed = 0;
  let rebuilt = 0;
  let unchanged = 0;

  speakersSnapshot.forEach((doc) => {
    const data = doc.data();
    const history = data['history'] as Record<string, { talks?: Array<{ title: string }> }> | undefined;

    if (!history || !history[year]) {
      return; // No history entry for this year — nothing to clean
    }

    if (!scheduledSpeakerIds.has(doc.id)) {
      console.log(`  [remove]  ${data['name']} — NOT on the schedule, removing history.${year}`);
      if (!dryRun) {
        batch.update(doc.ref, {
          [`history.${year}`]: FieldValue.delete(),
        });
      }
      removed++;
      return;
    }

    // Speaker IS on the schedule — rebuild talks from schedule data only
    const correctTalks = speakerTalks.get(doc.id) ?? [];
    const currentTalks = history[year]?.talks ?? [];
    const currentTitles = currentTalks.map((t) => t.title).sort().join('|');
    const correctTitles = correctTalks.map((t) => t.title).sort().join('|');

    if (currentTitles === correctTitles) {
      unchanged++;
      return;
    }

    console.log(`  [rebuild] ${data['name']} — talks: ${currentTalks.length} → ${correctTalks.length}`);
    if (!dryRun) {
      batch.update(doc.ref, {
        [`history.${year}.talks`]: correctTalks,
      });
    }
    rebuilt++;
  });

  console.log(`\nSummary: ${removed} removed, ${rebuilt} rebuilt, ${unchanged} unchanged`);

  const totalOps = removed + rebuilt;
  if (!dryRun && totalOps > 0) {
    console.log(`\nCommitting ${totalOps} updates...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would update ${totalOps} speakers.`);
  } else {
    console.log('\nNo changes needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
