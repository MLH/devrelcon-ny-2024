/**
 * Dump the entire Firestore database (all root collections, recursing into
 * subcollections) to a local JSON file.
 *
 * Usage:
 *   npx ts-node-script scripts/firestore-dump [output-path]
 *
 * Defaults to backups/firestore-<ISO timestamp>.json relative to the repo root.
 *
 * Output shape:
 *   { "<collection>": { "<docId>": { "__data": {...}, "__collections": {...} } } }
 * Subcollections appear under each document's `__collections` key, mirroring
 * the structure firestore-export-import style tools use.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { firestore } from '../firebase-config';

interface DumpedDoc {
  __data: FirebaseFirestore.DocumentData;
  __collections?: Record<string, Record<string, DumpedDoc>>;
}

let docCount = 0;

async function dumpCollection(
  collection: FirebaseFirestore.CollectionReference,
): Promise<Record<string, DumpedDoc>> {
  const out: Record<string, DumpedDoc> = {};
  const snapshot = await collection.get();
  for (const doc of snapshot.docs) {
    docCount++;
    const dumped: DumpedDoc = { __data: doc.data() };
    const subcollections = await doc.ref.listCollections();
    if (subcollections.length > 0) {
      dumped.__collections = {};
      for (const sub of subcollections) {
        dumped.__collections[sub.id] = await dumpCollection(sub);
      }
    }
    out[doc.id] = dumped;
  }
  return out;
}

async function main(): Promise<void> {
  const defaultPath = `backups/firestore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const outPath = resolve(process.cwd(), process.argv[2] ?? defaultPath);

  const collections = await firestore.listCollections();
  console.log(`Found ${collections.length} root collections`);

  const dump: Record<string, Record<string, DumpedDoc>> = {};
  for (const collection of collections) {
    process.stdout.write(`  Dumping ${collection.id}...`);
    const before = docCount;
    dump[collection.id] = await dumpCollection(collection);
    console.log(` ${docCount - before} docs (with subcollections)`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(dump, null, 2));
  console.log(`\nWrote ${docCount} documents to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Dump failed:', err);
  process.exit(1);
});
