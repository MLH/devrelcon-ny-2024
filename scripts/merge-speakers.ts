/**
 * Merge duplicate speaker documents that differ by case (e.g. Amit_Jotwani + amit_jotwani).
 *
 * For each group of duplicates:
 *   - The lowercase slug version is kept as the canonical doc
 *   - History entries are merged (union of all years)
 *   - Top-level fields prefer the active/more-complete doc
 *   - Session references are updated to point to the canonical ID
 *   - Duplicate docs are deleted
 *
 * Usage:
 *   npx ts-node-script scripts/merge-speakers --dry-run
 *   npx ts-node-script scripts/merge-speakers
 */

import { firestore } from './firebase-config';

const dryRun = process.argv.includes('--dry-run');

function toSlug(id: string): string {
  return id.toLowerCase();
}

interface SpeakerDoc {
  id: string;
  data: FirebaseFirestore.DocumentData;
}

/**
 * Pick the best value for a top-level field across duplicates.
 * Prefer the active doc's value, then the longest non-empty string.
 */
function pickBest(docs: SpeakerDoc[], field: string): unknown {
  // Prefer the active speaker's value
  const activeDoc = docs.find((d) => d.data['active']);
  if (activeDoc && activeDoc.data[field]) return activeDoc.data[field];

  // Otherwise pick the longest non-empty value
  let best: unknown = undefined;
  let bestLen = 0;
  for (const doc of docs) {
    const val = doc.data[field];
    if (val === undefined || val === null || val === '') continue;
    const len = typeof val === 'string' ? val.length : JSON.stringify(val).length;
    if (len > bestLen) {
      best = val;
      bestLen = len;
    }
  }
  return best;
}

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Fetch all speakers and group by lowercase slug
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  console.log(`  Found ${speakersSnapshot.size} speakers\n`);

  const groups = new Map<string, SpeakerDoc[]>();
  speakersSnapshot.forEach((doc) => {
    const slug = toSlug(doc.id);
    const existing = groups.get(slug) ?? [];
    existing.push({ id: doc.id, data: doc.data() });
    groups.set(slug, existing);
  });

  // Filter to only groups with duplicates
  const duplicates = [...groups.entries()].filter(([, docs]) => docs.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate speakers found.');
    process.exit(0);
  }

  console.log(`Found ${duplicates.length} group(s) of duplicates:\n`);

  // 2. Fetch all sessions (we'll need to update speaker references)
  console.log('Fetching sessions...');
  const sessionsSnapshot = await firestore.collection('sessions').get();
  const sessionDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  sessionsSnapshot.forEach((doc) => sessionDocs.set(doc.id, doc));
  console.log(`  Found ${sessionDocs.size} sessions\n`);

  const batch = firestore.batch();
  let mergeOps = 0;
  let deleteOps = 0;
  let sessionUpdates = 0;

  for (const [canonicalId, docs] of duplicates) {
    const ids = docs.map((d) => d.id);
    const aliasIds = ids.filter((id) => id !== canonicalId);

    console.log(`  [merge] ${ids.join(' + ')} → ${canonicalId}`);

    // Merge history: union of all years from all docs
    const mergedHistory: Record<string, unknown> = {};
    for (const doc of docs) {
      const history = (doc.data['history'] || {}) as Record<string, unknown>;
      for (const [year, snapshot] of Object.entries(history)) {
        // If both docs have the same year, prefer the one with more talks
        if (mergedHistory[year]) {
          const existing = mergedHistory[year] as { talks?: unknown[] };
          const incoming = snapshot as { talks?: unknown[] };
          if ((incoming.talks?.length ?? 0) > (existing.talks?.length ?? 0)) {
            mergedHistory[year] = snapshot;
          }
        } else {
          mergedHistory[year] = snapshot;
        }
      }
    }

    // Build merged doc: prefer active doc's fields, then longest value
    const merged: Record<string, unknown> = {
      active: docs.some((d) => d.data['active']) || false,
      badges: pickBest(docs, 'badges') ?? [],
      bio: pickBest(docs, 'bio') ?? '',
      company: pickBest(docs, 'company') ?? '',
      companyLogo: pickBest(docs, 'companyLogo') ?? '',
      companyLogoUrl: pickBest(docs, 'companyLogoUrl') ?? '',
      country: pickBest(docs, 'country') ?? '',
      featured: docs.some((d) => d.data['featured']) || false,
      history: mergedHistory,
      name: pickBest(docs, 'name') ?? '',
      order: pickBest(docs, 'order') ?? 0,
      photo: pickBest(docs, 'photo') ?? '',
      photoUrl: pickBest(docs, 'photoUrl') ?? '',
      shortBio: pickBest(docs, 'shortBio') ?? '',
      socials: pickBest(docs, 'socials') ?? [],
      title: pickBest(docs, 'title') ?? '',
    };
    // Preserve pronouns if present
    const pronouns = pickBest(docs, 'pronouns');
    if (pronouns) merged['pronouns'] = pronouns;

    console.log(`    history years: ${Object.keys(mergedHistory).join(', ') || 'none'}`);
    console.log(`    active: ${merged['active']}, featured: ${merged['featured']}`);

    if (!dryRun) {
      batch.set(firestore.collection('speakers').doc(canonicalId), merged);
      mergeOps++;
    }

    // Delete alias docs
    for (const aliasId of aliasIds) {
      console.log(`    [delete] speakers/${aliasId}`);
      if (!dryRun) {
        batch.delete(firestore.collection('speakers').doc(aliasId));
        deleteOps++;
      }
    }

    // Update session references: replace alias IDs with canonical
    for (const [sessionId, sessionDoc] of sessionDocs) {
      const speakers = sessionDoc.data()['speakers'] as string[] | undefined;
      if (!speakers) continue;

      const hasAlias = speakers.some((id) => aliasIds.includes(id));
      if (!hasAlias) continue;

      // Replace aliases with canonical, deduplicate
      const updated = [...new Set(speakers.map((id) => (aliasIds.includes(id) ? canonicalId : id)))];
      console.log(`    [session] ${sessionId}: speakers ${JSON.stringify(speakers)} → ${JSON.stringify(updated)}`);
      if (!dryRun) {
        batch.update(firestore.collection('sessions').doc(sessionId), { speakers: updated });
        sessionUpdates++;
      }
    }

    console.log('');
  }

  const totalOps = mergeOps + deleteOps + sessionUpdates;
  console.log(`Summary: ${mergeOps} merged, ${deleteOps} deleted, ${sessionUpdates} sessions updated`);

  if (!dryRun && totalOps > 0) {
    console.log(`\nCommitting ${totalOps} operations...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would perform ${totalOps} operations.`);
  } else {
    console.log('\nNo changes needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Merge failed:', err);
  process.exit(1);
});
