/**
 * Remove history entries for a given year from speakers who are NOT on the schedule.
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

  // 1. Collect speaker IDs that are actually assigned to sessions
  console.log('Fetching sessions...');
  const sessionsSnapshot = await firestore.collection('sessions').get();
  const scheduledSpeakerIds = new Set<string>();
  sessionsSnapshot.forEach((doc) => {
    const speakers = doc.data()['speakers'] as string[] | undefined;
    if (speakers) {
      for (const id of speakers) {
        scheduledSpeakerIds.add(id);
      }
    }
  });
  console.log(`  Found ${sessionsSnapshot.size} sessions`);
  console.log(`  ${scheduledSpeakerIds.size} unique speaker IDs on the schedule\n`);

  // 2. Find speakers with a history entry for this year who are NOT on the schedule
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  console.log(`  Found ${speakersSnapshot.size} speakers\n`);

  const batch = firestore.batch();
  let ops = 0;
  let skipped = 0;

  speakersSnapshot.forEach((doc) => {
    const data = doc.data();
    const history = data['history'] as Record<string, unknown> | undefined;

    if (!history || !history[year]) {
      return; // No history entry for this year — nothing to clean
    }

    if (scheduledSpeakerIds.has(doc.id)) {
      skipped++;
      console.log(`  [keep]   ${data['name']} — on the schedule`);
      return;
    }

    console.log(`  [remove] ${data['name']} — NOT on the schedule, removing history.${year}`);
    if (!dryRun) {
      batch.update(doc.ref, {
        [`history.${year}`]: FieldValue.delete(),
      });
      ops++;
    }
  });

  console.log(`\nSummary: ${ops} to remove, ${skipped} to keep`);

  if (!dryRun && ops > 0) {
    console.log(`\nCommitting ${ops} updates...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would remove history.${year} from ${ops} speakers.`);
  } else {
    console.log('\nNo changes needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
