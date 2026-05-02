# Unified Speakers Collection Design

**Goal:** Merge `speakers` and `previousSpeakers` into a single `speakers` collection so repeat speakers have one record with year-by-year history, eliminating data duplication.

## Data Model

The `speakers` collection becomes the single source of truth. Each document represents one person across all years:

```typescript
interface UnifiedSpeaker {
  // Current profile (always the most recent info)
  name: string;
  bio: string;
  company: string;
  companyLogo?: string;
  country: string;
  photoUrl: string;
  socials: Social[];
  title: string;
  order: number;
  pronouns?: string;

  // Current-year flags
  active: boolean; // true = speaking this year
  featured: boolean; // shown on home page (only meaningful when active)
  badges?: Badge[];

  // Year-by-year history (populated by archive script)
  history: {
    [year: string]: {
      bio: string;
      company: string;
      title: string;
      talks: Array<{
        title: string;
        tags: string[];
        presentation?: string;
        videoId?: string;
      }>;
    };
  };
}
```

The `sessions` and `schedule` collections stay unchanged. They still reference speaker IDs the same way.

## Routing

Routes collapse from 4 to 2, with backward-compatible redirects:

| Route                    | Behavior                                              |
| ------------------------ | ----------------------------------------------------- |
| `/speakers`              | Active speakers grid on top, past speakers below      |
| `/speakers/:id`          | Unified detail: current sessions + past talks history |
| `/previous-speakers`     | Redirect to `/speakers`                               |
| `/previous-speakers/:id` | Redirect to `/speakers/:id`                           |

## Speaker List Page (`/speakers`)

Two sections:

1. **Active speakers** — filterable grid with photos, company, badges. Only shows when `active: true` speakers exist.
2. **Past speakers** — simpler grid below with "Past Speakers" heading. Shows most recent year's company/title.

## Speaker Detail Page (`/speakers/:id`)

- **Top:** Current bio, photo, company, socials (from top-level fields)
- **Middle:** Current year sessions with times/tracks (from `generatedSpeakers` enrichment, only if `active`)
- **Bottom:** "Past Talks" section — year-by-year list showing that year's company, title, bio, and talks

If the speaker is not active, the current sessions section is skipped.

## Home Page

- If any `active` + `featured` speakers exist: show featured speakers grid (`speakers-block`)
- Otherwise: fall back to previous speakers carousel (from speakers with `history`)

## Redux Store

Collapse `store/speakers/` and `store/previous-speakers/` into one slice.

**State:** `RemoteData<Error, UnifiedSpeaker[]>`

**Selectors:**

- `selectSpeakers()` — all speakers
- `selectActiveSpeakers()` — `active: true`
- `selectPastSpeakers()` — anyone with `history` entries
- `selectFeaturedSpeakers()` — `active: true` AND `featured: true`
- `selectSpeaker(state, id)` — single speaker by ID
- `selectFilteredSpeakers()` — tag filter, scoped to active speakers
- `selectRandomPastSpeakers()` — for home page fallback carousel

**Deleted:** `store/previous-speakers/` entire directory and all references.

## Cloud Function

The `generatedSpeakers` pipeline gets one change: pass through the `history` field from the source speaker doc. Also write inactive speakers to `generatedSpeakers` (without enriched session data) so the frontend has one data source.

## Admin Panel

- **Speakers schema** gains `active` boolean toggle and `history` section (year-grouped talks with bio/company/title per year)
- **Previous Speakers** nav item removed from admin sidebar
- Previous speakers schema and form deleted

## Archive Script (yearly)

Run at end of each conference year:

1. For each active speaker: snapshot current bio/company/title + their sessions into `history["YYYY"]`
2. Set `active: false`, `featured: false`
3. Clear `sessions` and `schedule` collections

## Migration Script (one-time)

Moves existing `previousSpeakers` data into the unified model:

1. Read all `previousSpeakers` docs
2. For each: check if matching speaker exists in `speakers` (by ID or name slug)
   - Match found: merge `sessions` into that speaker's `history` field
   - No match: create new speaker doc with `active: false`, data mapped into `history`
3. After verification, delete `previousSpeakers` collection

## Rollout Order

1. Run migration script (copies data, old collection stays as safety net)
2. Deploy code changes (unified model, new pages, updated Cloud Function)
3. Verify in production
4. Clean up: delete `previousSpeakers` collection and its Firestore rules

## Components

**Modified:** speakers-page, speaker-page, speakers-block, previous-speakers-block, rotating-speakers-carousel

**Deleted:** previous-speakers-page, previous-speaker-page, models/previous-speaker.ts, models/previous-session.ts, store/previous-speakers/
