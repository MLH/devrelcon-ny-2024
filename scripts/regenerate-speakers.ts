/**
 * Clear stale generatedSpeakers docs and trigger regeneration by
 * touching a speaker doc (which fires the Cloud Function).
 *
 * Usage:
 *   npx ts-node-script scripts/regenerate-speakers --dry-run
 *   npx ts-node-script scripts/regenerate-speakers
 */

import { firestore } from './firebase-config';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Delete all generatedSpeakers docs
  console.log('Fetching generatedSpeakers...');
  const generatedSnapshot = await firestore.collection('generatedSpeakers').get();
  console.log(`  Found ${generatedSnapshot.size} docs to clear\n`);

  if (!dryRun && generatedSnapshot.size > 0) {
    const batchSize = 500;
    for (let i = 0; i < generatedSnapshot.docs.length; i += batchSize) {
      const batch = firestore.batch();
      const chunk = generatedSnapshot.docs.slice(i, i + batchSize);
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      console.log(`  Deleted ${Math.min(i + batchSize, generatedSnapshot.size)} / ${generatedSnapshot.size}`);
    }
    console.log('  Cleared generatedSpeakers.\n');
  }

  // 2. Touch a speaker doc to trigger the Cloud Function
  console.log('Triggering regeneration...');
  const speakersSnapshot = await firestore.collection('speakers').limit(1).get();

  if (speakersSnapshot.empty) {
    console.log('  No speakers found — nothing to regenerate.');
    process.exit(0);
  }

  const firstSpeaker = speakersSnapshot.docs[0]!;
  console.log(`  Touching speakers/${firstSpeaker.id} to fire Cloud Function`);

  if (!dryRun) {
    // Write the same data back — triggers onWrite without changing anything
    await firstSpeaker.ref.update({ _regenerated: new Date().toISOString() });
    console.log('  Done! Cloud Function will regenerate generatedSpeakers, generatedSessions, and generatedSchedule.');
  }

  if (dryRun) {
    console.log('\n[dry-run] No changes written.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Regenerate failed:', err);
  process.exit(1);
});
