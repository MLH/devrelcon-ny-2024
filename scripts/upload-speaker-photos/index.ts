/**
 * Upload local speaker photos to Firebase Storage and update Firestore.
 *
 * Expects a directory of image files named <speakerDocId>.<ext>
 * (e.g. kurtis_kemple.jpg, dawn_wages.png). Useful when the source images
 * are not reachable by URL (e.g. private Google Drive files downloaded by
 * other means).
 *
 * Usage:
 *   npx ts-node-script scripts/upload-speaker-photos <dir> [--dry-run]
 */

import { readdirSync, readFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { applicationDefault, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from '../../serviceAccount.json';

// Prefer a real service account key; fall back to Application Default
// Credentials (`gcloud auth application-default login`) when
// serviceAccount.json is the empty `{}` stub used by CI.
const hasKey = 'private_key' in (serviceAccount as Record<string, unknown>);
const credential = hasKey ? cert(serviceAccount as ServiceAccount) : applicationDefault();
const app = initializeApp(
  { credential, projectId: 'devrelcon-ny-2024', storageBucket: 'devrelcon-ny-2024.appspot.com' },
  'upload-photos',
);
const firestore = getFirestore(app);
const bucket = getStorage(app).bucket();

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const dir = argv.filter((a) => !a.startsWith('--'))[0];
  if (!dir) {
    console.error('Usage: npx ts-node-script scripts/upload-speaker-photos <dir> [--dry-run]');
    process.exit(1);
  }
  if (dryRun) console.log('=== DRY RUN ===\n');

  const dirPath = resolve(process.cwd(), dir);
  const files = readdirSync(dirPath).filter((f) => extname(f).toLowerCase() in CONTENT_TYPES);
  console.log(`Found ${files.length} image(s) in ${dirPath}`);

  let uploaded = 0;
  const missing: string[] = [];

  for (const fileName of files.sort()) {
    const ext = extname(fileName).toLowerCase();
    const speakerId = fileName.slice(0, -ext.length);

    const doc = await firestore.collection('speakers').doc(speakerId).get();
    if (!doc.exists) {
      missing.push(speakerId);
      console.warn(`  [skip] no speaker doc "${speakerId}" for ${fileName}`);
      continue;
    }

    const buffer = readFileSync(join(dirPath, fileName));
    const storagePath = `admin-uploads/speakers/photos/${speakerId}${ext}`;
    const newUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log(`  ${speakerId}: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
    console.log(`    -> ${newUrl}`);

    if (dryRun) continue;

    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: { contentType: CONTENT_TYPES[ext]!, cacheControl: 'public, max-age=31536000' },
    });
    await file.makePublic();
    await doc.ref.update({ photo: newUrl, photoUrl: newUrl });
    uploaded++;
  }

  console.log(`\n${dryRun ? 'Would upload' : 'Uploaded'} ${uploaded || files.length} photo(s)`);
  if (missing.length > 0) {
    console.log(`Skipped (no matching speaker doc): ${missing.join(', ')}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
