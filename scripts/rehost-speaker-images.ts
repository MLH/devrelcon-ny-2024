/**
 * Download speaker photos and company logos from external URLs, upload them
 * to Firebase Storage, and update Firestore with the new hosted URLs.
 *
 * Produces a report of broken/inaccessible URLs at the end.
 *
 * Usage:
 *   npx ts-node-script scripts/rehost-speaker-images --dry-run
 *   npx ts-node-script scripts/rehost-speaker-images
 *
 * Flags:
 *   --dry-run   Preview without uploading or updating Firestore
 *   --force     Re-download even if URL already points to Firebase Storage
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import serviceAccount from '../serviceAccount.json';

const credential = cert(serviceAccount as ServiceAccount);
const app = initializeApp({ credential, storageBucket: 'devrelcon-ny-2024.appspot.com' }, 'rehost');
const firestore = getFirestore(app);
const bucket = getStorage(app).bucket();

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

interface BrokenUrl {
  speakerId: string;
  speakerName: string;
  field: string;
  url: string;
  error: string;
}

const brokenUrls: BrokenUrl[] = [];

/**
 * Check if a URL already points to Firebase Storage for this project.
 */
function isAlreadyHosted(url: string): boolean {
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com/devrelcon-ny-2024')
  );
}

/**
 * Guess a file extension from the Content-Type header.
 */
function extFromContentType(contentType: string | undefined): string {
  if (!contentType) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('svg')) return '.svg';
  return '.jpg';
}

/**
 * Follow redirects and download a URL to a Buffer. Returns null on failure.
 */
function downloadImage(
  url: string,
  maxRedirects = 5
): Promise<{ buffer: Buffer; contentType: string | undefined } | null> {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) {
      resolve(null);
      return;
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        // Handle relative redirects
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        resolve(downloadImage(redirectUrl, maxRedirects - 1));
        return;
      }

      if (!res.statusCode || res.statusCode >= 400) {
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
          resolve(null);
          return;
        }
        resolve({ buffer, contentType: res.headers['content-type'] });
      });
      res.on('error', () => resolve(null));
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Upload a buffer to Firebase Storage and make it public.
 * Returns the public URL.
 */
async function uploadToStorage(
  buffer: Buffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType, cacheControl: 'public, max-age=31536000' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Process a single image field for a speaker.
 */
async function processImage(
  speakerId: string,
  speakerName: string,
  field: 'photoUrl' | 'companyLogoUrl',
  url: string
): Promise<{ field: string; newUrl: string } | null> {
  if (!url || url.trim() === '') return null;

  // Skip if already hosted on Firebase Storage (unless --force)
  if (!force && isAlreadyHosted(url)) {
    return null;
  }

  const result = await downloadImage(url);
  if (!result) {
    brokenUrls.push({ speakerId, speakerName, field, url, error: 'Download failed (404, timeout, or empty)' });
    return null;
  }

  const ext = extFromContentType(result.contentType);
  const subfolder = field === 'photoUrl' ? 'photos' : 'logos';
  const storagePath = `admin-uploads/speakers/${subfolder}/${speakerId}${ext}`;

  if (dryRun) {
    console.log(`    [upload] ${storagePath} (${(result.buffer.length / 1024).toFixed(1)} KB)`);
    return { field, newUrl: `https://storage.googleapis.com/${bucket.name}/${storagePath}` };
  }

  const newUrl = await uploadToStorage(result.buffer, storagePath, result.contentType || 'image/jpeg');
  console.log(`    [upload] ${storagePath} (${(result.buffer.length / 1024).toFixed(1)} KB)`);
  return { field, newUrl };
}

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n');

  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  console.log(`  Found ${speakersSnapshot.size} speakers\n`);

  let uploaded = 0;
  let skipped = 0;
  let updated = 0;

  for (const doc of speakersSnapshot.docs) {
    const data = doc.data();
    const name = (data['name'] as string) || doc.id;
    const photoUrl = (data['photoUrl'] as string) || '';

    const hasExternalPhoto = photoUrl && !isAlreadyHosted(photoUrl);

    // Skip company logos — use `npm run firestore:update-logos` (logo.dev) instead
    if (!force && !hasExternalPhoto) {
      skipped++;
      continue;
    }

    console.log(`  ${name} (${doc.id})`);

    const updates: Record<string, string> = {};

    // Process photo (company logos handled by logo.dev via update-company-logos script)
    if (photoUrl && (force || hasExternalPhoto)) {
      const result = await processImage(doc.id, name, 'photoUrl', photoUrl);
      if (result) {
        updates[result.field] = result.newUrl;
        uploaded++;
      }
    }

    if (Object.keys(updates).length > 0 && !dryRun) {
      await firestore.collection('speakers').doc(doc.id).update(updates);
      updated++;
    }
  }

  console.log(`\nSummary: ${uploaded} images uploaded, ${updated} speakers updated, ${skipped} skipped (already hosted)`);

  // Report broken URLs
  if (brokenUrls.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BROKEN URLs (${brokenUrls.length}) — needs manual attention:`);
    console.log(`${'='.repeat(60)}`);
    for (const { speakerId, speakerName, field, url, error } of brokenUrls) {
      console.log(`\n  Speaker: ${speakerName} (${speakerId})`);
      console.log(`  Field:   ${field}`);
      console.log(`  URL:     ${url}`);
      console.log(`  Error:   ${error}`);
    }
    console.log(`\n${'='.repeat(60)}`);
  } else {
    console.log('\nNo broken URLs found.');
  }

  if (dryRun) {
    console.log(`\n[dry-run] No changes written.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Rehost failed:', err);
  process.exit(1);
});
