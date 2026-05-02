/**
 * Mark speakers as active if they are assigned to any session.
 *
 * Usage:
 *   npx ts-node-script scripts/activate-speakers
 *   npx ts-node-script scripts/activate-speakers --dry-run
 */

import { firestore } from './firebase-config';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n');

  console.log('Fetching sessions...');
  const sessionsSnapshot = await firestore.collection('sessions').get();
  console.log(`  Found ${sessionsSnapshot.size} sessions`);

  // Collect all speaker IDs referenced in sessions (normalized to lowercase)
  const activeSpeakerIds = new Set<string>();
  sessionsSnapshot.forEach((doc) => {
    const speakers = doc.data()['speakers'] as string[] | undefined;
    if (speakers) {
      for (const id of speakers) {
        activeSpeakerIds.add(id.toLowerCase());
      }
    }
  });

  console.log(`  Found ${activeSpeakerIds.size} unique speaker IDs across sessions\n`);

  if (activeSpeakerIds.size === 0) {
    console.log('No speakers assigned to sessions. Exiting.');
    process.exit(0);
  }

  // Update each speaker
  const batch = firestore.batch();
  let ops = 0;

  for (const speakerId of activeSpeakerIds) {
    const ref = firestore.collection('speakers').doc(speakerId);
    const doc = await ref.get();

    if (!doc.exists) {
      console.log(`  [skip] ${speakerId} — not found in speakers collection`);
      continue;
    }

    const data = doc.data()!;
    if (data['active']) {
      console.log(`  [skip] ${data['name']} — already active`);
      continue;
    }

    console.log(`  [activate] ${data['name']}`);
    if (!dryRun) {
      batch.update(ref, { active: true });
      ops++;
    }
  }

  if (!dryRun && ops > 0) {
    console.log(`\nCommitting ${ops} updates...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would activate ${ops} speakers.`);
  } else {
    console.log('\nNo changes needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
