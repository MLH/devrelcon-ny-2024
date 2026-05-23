/**
 * Import speakers, sessions, and schedule from a CSV.
 *
 * Usage:
 *   npx ts-node-script scripts/import-from-csv path/to/talks.csv [--dry-run]
 *
 * CSV columns (one row per talk × speaker):
 *   title, description, stage, day, startTime, endTime,
 *   speakerName, speakerTitle, speakerHeadshotUrl, speakerCompany
 *
 * Prerequisite: run
 *   npm run firestore:archive-speakers -- --year <prevYear> --clear
 * before this script to archive last year's speakers and wipe
 * the sessions and schedule collections.
 */

import { readFileSync } from 'fs';
import { firestore } from '../firebase-config';
import { parseCsv } from './csv';
import { groupTalks } from './grouping';
import { planSpeakers, type CsvSpeaker, type ExistingSpeaker } from './speakers';
import { buildSessions } from './sessions';
import { buildSchedule } from './schedule';

interface Args {
  csvPath: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((a) => !a.startsWith('--'));
  const csvPath = positional[0];
  if (!csvPath) {
    console.error('Usage: npx ts-node-script scripts/import-from-csv <csv-path> [--dry-run]');
    process.exit(1);
  }
  return { csvPath, dryRun };
}

async function commitInBatches(
  ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = firestore.batch();
    for (const op of ops.slice(i, i + CHUNK)) op(batch);
    await batch.commit();
  }
}

async function main(): Promise<void> {
  const { csvPath, dryRun } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Read + parse CSV.
  const raw = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} CSV rows from ${csvPath}`);

  // 2. Group into talks.
  const { talks, warnings: groupingWarnings } = groupTalks(rows);
  for (const w of groupingWarnings) console.warn(`[warn] ${w}`);
  console.log(`Grouped into ${talks.length} talks`);

  // 3. Fetch existing speakers, plan upserts.
  console.log('Fetching existing speakers...');
  const speakersSnap = await firestore.collection('speakers').get();
  const existing: ExistingSpeaker[] = [];
  speakersSnap.forEach((doc) => {
    existing.push({ id: doc.id, data: doc.data() as ExistingSpeaker['data'] });
  });
  console.log(`  Found ${existing.length} existing speakers`);

  const activeCount = existing.filter((e) => e.data['active']).length;
  if (activeCount > 0) {
    console.warn(
      `[warn] ${activeCount} active speakers exist. Did you run firestore:archive-speakers --clear first?`,
    );
  }

  const csvSpeakers: CsvSpeaker[] = [];
  for (const t of talks) {
    for (const s of t.speakers) {
      csvSpeakers.push({
        name: s.name,
        title: s.title,
        company: s.company,
        headshotUrl: s.headshotUrl,
      });
    }
  }
  const speakerPlan = planSpeakers(csvSpeakers, existing);
  console.log(
    `  Plan: ${speakerPlan.updates.length} speakers to update, ${speakerPlan.creates.length} new`,
  );

  // 4. Build sessions.
  console.log('Fetching existing sessions for ID continuation...');
  const sessionsSnap = await firestore.collection('sessions').get();
  const existingSessionIds: string[] = [];
  sessionsSnap.forEach((doc) => existingSessionIds.push(doc.id));
  const { sessions, talkToSessionId } = buildSessions({
    talks,
    existingSessionIds,
    resolveByName: speakerPlan.resolveByName,
  });
  console.log(`  Built ${sessions.length} session docs`);

  // 5. Build schedule.
  const days = buildSchedule({ talks, talkToSessionId });
  console.log(`  Built ${days.length} schedule day(s)`);

  // 6. Summary.
  console.log('\nSummary:');
  console.log(
    `  Speakers: ${speakerPlan.creates.length} create, ${speakerPlan.updates.length} update`,
  );
  console.log(`  Sessions: ${sessions.length}`);
  console.log(`  Schedule days: ${days.length}`);

  if (dryRun) {
    console.log('\n[dry-run] No writes performed.');
    process.exit(0);
  }

  // 7. Write.
  console.log('\nWriting speakers...');
  const speakerOps: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];
  for (const u of speakerPlan.updates) {
    speakerOps.push((b) => b.update(firestore.collection('speakers').doc(u.id), u.fields));
  }
  for (const c of speakerPlan.creates) {
    speakerOps.push((b) => b.set(firestore.collection('speakers').doc(c.id), c.doc));
  }
  await commitInBatches(speakerOps);
  console.log(`  Wrote ${speakerOps.length} speaker ops`);

  console.log('Writing sessions...');
  const sessionOps = sessions.map(
    (s) => (b: FirebaseFirestore.WriteBatch) =>
      b.set(firestore.collection('sessions').doc(s.id), s.doc),
  );
  await commitInBatches(sessionOps);
  console.log(`  Wrote ${sessionOps.length} session docs`);

  console.log('Writing schedule...');
  const scheduleOps = days.map(
    (d) => (b: FirebaseFirestore.WriteBatch) =>
      b.set(firestore.collection('schedule').doc(d.date), {
        date: d.date,
        dateReadable: d.dateReadable,
        timeslots: d.timeslots,
        tracks: d.tracks,
      }),
  );
  await commitInBatches(scheduleOps);
  console.log(`  Wrote ${scheduleOps.length} schedule day(s)`);

  console.log('\nImport complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
