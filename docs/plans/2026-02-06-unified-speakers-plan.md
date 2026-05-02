# Unified Speakers Collection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge `speakers` and `previousSpeakers` into a single `speakers` collection with year-by-year history, eliminating data duplication for repeat speakers.

**Architecture:** Add `active`, `featured`, and `history` fields to the speaker model. Update the Cloud Function to pass `history` through to `generatedSpeakers` and write inactive speakers too. Collapse the frontend from 4 pages to 2 routes with redirects. Merge two Redux store slices into one. Create a one-time migration script and a yearly archive script.

**Tech Stack:** TypeScript, Polymer 3, LitElement, Redux Toolkit, Firebase (Firestore, Cloud Functions), Shoelace (admin panel)

---

### Task 1: Update Speaker Data Model

**Files:**

- Modify: `src/models/speaker.ts`
- Modify: `src/models/previous-session.ts`

**Context:** The `SpeakerData` interface in `speaker.ts` currently has no `active`, `history`, or explicit `featured` field (it does have `featured: boolean` already). We need to add `active` and `history`. The `PreviousSession` type will be reused for history talks, and we add a `YearSnapshot` type for the per-year data (bio/company/title + talks).

**Step 1: Update speaker model**

In `src/models/speaker.ts`, add the `history` field and `active` flag:

```typescript
import { Badge } from './badge';
import { Social } from './social';
import { Id } from './types';
import { YearSnapshot } from './previous-session';

export interface SpeakerData {
  active: boolean;
  badges?: Badge[];
  bio: string;
  company: string;
  companyLogo: string;
  companyLogoUrl: string;
  country: string;
  featured: boolean;
  history: { [year: string]: YearSnapshot };
  name: string;
  order: number;
  photo: string;
  photoUrl: string;
  pronouns?: string;
  shortBio: string;
  socials: Social[];
  title: string;
}

export type Speaker = Id & SpeakerData;

export type SpeakerWithTags = Speaker & {
  tags: string[];
};
```

**Step 2: Update previous-session model to add YearSnapshot**

Replace `src/models/previous-session.ts` with:

```typescript
export interface PreviousSession {
  presentation?: string;
  tags: string[];
  title: string;
  videoId?: string;
}

export interface PreviousSessionWithYear extends PreviousSession {
  year: string;
}

export interface YearSnapshot {
  bio: string;
  company: string;
  title: string;
  talks: PreviousSession[];
}
```

**Step 3: Run type check to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in files that reference the old model (this is expected — we'll fix them in subsequent tasks)

**Step 4: Commit**

```bash
git add src/models/speaker.ts src/models/previous-session.ts
git commit -m "feat: add active flag and history to speaker model"
```

---

### Task 2: Update Redux Store — Merge Slices

**Files:**

- Modify: `src/store/speakers/selectors.ts`
- Modify: `src/store/reducers.ts`
- Delete: `src/store/previous-speakers/` (entire directory)

**Context:** Currently there are two Redux slices: `store/speakers/` (reads from `generatedSpeakers` collection) and `store/previous-speakers/` (reads from `previousSpeakers` collection). We merge into one slice. The `speakers` actions/reducers/state/types stay the same — they already subscribe to `generatedSpeakers`. We just add new selectors and remove the `previousSpeakers` slice entirely.

**Step 1: Add new selectors to `src/store/speakers/selectors.ts`**

Replace the entire file with:

```typescript
import { Initialized, Success } from '@abraham/remotedata';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, store } from '..';
import { Filter } from '../../models/filter';
import { SpeakerWithTags } from '../../models/speaker';
import { selectFilters } from '../../store/filters/selectors';
import { generateClassName } from '../../utils/styles';
import { randomOrder } from '../../utils/arrays';
import { selectViewport } from '../ui/selectors';
import { Viewport } from '../ui/types';
import { fetchSpeakers } from './actions';

const selectSpeakerId = (_state: RootState, speakerId: string) => speakerId;

const selectSpeakers = (state: RootState): SpeakerWithTags[] => {
  const { speakers } = state;
  if (speakers instanceof Success) {
    return speakers.data;
  } else if (speakers instanceof Initialized) {
    store.dispatch(fetchSpeakers);
  }
  return [];
};

export const selectActiveSpeakers = createSelector(
  selectSpeakers,
  (speakers: SpeakerWithTags[]): SpeakerWithTags[] => {
    return speakers.filter((speaker) => speaker.active);
  },
);

export const selectPastSpeakers = createSelector(
  selectSpeakers,
  (speakers: SpeakerWithTags[]): SpeakerWithTags[] => {
    return speakers
      .filter((speaker) => speaker.history && Object.keys(speaker.history).length > 0)
      .sort((a, b) => {
        const aYears = Object.keys(a.history || {});
        const bYears = Object.keys(b.history || {});
        const aMax = aYears.length > 0 ? Math.max(...aYears.map(Number)) : 0;
        const bMax = bYears.length > 0 ? Math.max(...bYears.map(Number)) : 0;
        return bMax - aMax;
      });
  },
);

export const selectFeaturedSpeakers = createSelector(
  selectActiveSpeakers,
  (speakers: SpeakerWithTags[]): SpeakerWithTags[] => {
    return speakers.filter((speaker) => speaker.featured);
  },
);

export const selectSpeaker = createSelector(
  selectSpeakers,
  selectSpeakerId,
  (speakers: SpeakerWithTags[], speakerId: string): SpeakerWithTags | undefined => {
    return speakers.find((speaker) => speaker.id === speakerId);
  },
);

export const selectFilteredSpeakers = createSelector(
  selectActiveSpeakers,
  selectFilters,
  (speakers: SpeakerWithTags[], selectedFilters: Filter[]): SpeakerWithTags[] => {
    if (selectedFilters.length === 0) return speakers;

    return speakers.filter((speaker) => {
      return (speaker.tags || []).some((tag) => {
        const className = generateClassName(tag);
        return selectedFilters.some((filter) => filter.tag === className);
      });
    });
  },
);

export const selectRandomPastSpeakers = createSelector(
  selectPastSpeakers,
  selectViewport,
  (pastSpeakers: SpeakerWithTags[], viewport: Viewport): SpeakerWithTags[] => {
    const displayCount = viewport.isPhone ? 8 : 14;
    return randomOrder(pastSpeakers).slice(0, displayCount);
  },
);
```

**Step 2: Remove `previousSpeakers` from root reducer**

In `src/store/reducers.ts`, remove the import and reducer entry:

- Remove: `import { previousSpeakersReducer } from './previous-speakers/reducers';`
- Remove: `previousSpeakers: previousSpeakersReducer,`

**Step 3: Delete the previous-speakers store directory**

Delete the entire `src/store/previous-speakers/` directory (5 files: actions.ts, reducers.ts, selectors.ts, state.ts, types.ts).

**Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: More errors in consuming components (will fix in next tasks)

**Step 5: Commit**

```bash
git add src/store/speakers/selectors.ts src/store/reducers.ts
git add -u src/store/previous-speakers/
git commit -m "feat: merge previous-speakers Redux slice into speakers"
```

---

### Task 3: Update Cloud Function — Pass Through History

**Files:**

- Modify: `functions/src/generate-sessions-speakers-schedule.ts`
- Modify: `functions/src/schedule-generator/speakers-sessions-schedule-map.ts`

**Context:** The Cloud Function generates `generatedSpeakers` from `speakers` + `sessions` + `schedule`. Currently, speakers without session assignments are only written if they were the trigger. We need to: (1) pass through the `history` field from source speaker data, and (2) always write ALL speakers to `generatedSpeakers`, including inactive ones without sessions.

**Step 1: Update `generateAndSaveData` in `functions/src/generate-sessions-speakers-schedule.ts`**

After line 75 (`generatedData.speakers[changedSpeaker.id] = changedSpeaker;`), add a loop to include all speakers that weren't already in generatedData:

Replace the function `generateAndSaveData` (lines 52-80) with:

```typescript
async function generateAndSaveData(changedSpeaker?) {
  const [sessionsSnapshot, scheduleSnapshot, speakersSnapshot] = await fetchData();

  const sessions = snapshotToObject(sessionsSnapshot);
  const schedule = snapshotToObject(scheduleSnapshot);
  const speakers = snapshotToObject(speakersSnapshot);

  let generatedData: {
    sessions?: {};
    speakers?: {};
    schedule?: {};
  } = {};
  if (!Object.keys(sessions).length) {
    generatedData.speakers = { ...speakers };
  } else if (!(await isScheduleEnabled()) || !Object.keys(schedule).length) {
    generatedData = sessionsSpeakersMap(sessions, speakers);
  } else {
    generatedData = sessionsSpeakersScheduleMap(sessions, speakers, schedule);
  }

  // If changed speaker does not have assigned session(s) yet
  if (changedSpeaker && !generatedData.speakers[changedSpeaker.id]) {
    generatedData.speakers[changedSpeaker.id] = changedSpeaker;
  }

  // Include all speakers (active and inactive) in generated output
  // This ensures inactive/past speakers are available to the frontend
  for (const [speakerId, speaker] of Object.entries(speakers)) {
    if (!generatedData.speakers[speakerId]) {
      generatedData.speakers[speakerId] = { ...speaker, id: speakerId };
    }
  }

  saveGeneratedData(generatedData.sessions, 'generatedSessions');
  saveGeneratedData(generatedData.speakers, 'generatedSpeakers');
  saveGeneratedData(generatedData.schedule, 'generatedSchedule');
}
```

**Step 2: Pass `history` through in `updateSpeakersSessions`**

In `functions/src/schedule-generator/speakers-sessions-schedule-map.ts`, the `updateSpeakersSessions` function at line 141 builds enriched speaker objects. The `Object.assign({}, speaker, { ... })` on line 160 already spreads the source speaker data, which will naturally include `history` if present. No change needed here — `history` is already passed through via the spread.

Verify by reading line 160: `result[speakerIds[i]] = Object.assign({}, speaker, { id, sessions, tags })` — `speaker` contains all original fields including `history`.

**Step 3: Build functions to verify**

Run: `npm --prefix ./functions run build`
Expected: Successful build

**Step 4: Commit**

```bash
git add functions/src/generate-sessions-speakers-schedule.ts
git commit -m "feat: write all speakers to generatedSpeakers, including inactive"
```

---

### Task 4: Update Router — Add Redirects, Remove Old Routes

**Files:**

- Modify: `src/router.ts`

**Context:** Currently the router has routes for `/speakers`, `/speakers/:id`, `/previous-speakers`, and `/previous-speakers/:id`. We need to redirect the previous-speakers routes to their speaker equivalents.

**Step 1: Update routes in `src/router.ts`**

Replace the `previous-speakers` route block (lines 122-139) with redirects:

```typescript
  {
    path: '/previous-speakers',
    redirect: '/speakers',
  },
  {
    path: '/previous-speakers/:id',
    redirect: '/speakers/:id',
  },
```

Also update the `selectRouteName` function to remove the `previous-speakers` case (lines 28-30), since they now redirect:

```typescript
export const selectRouteName = (pathname: string): string => {
  let [, part] = pathname.split('/');
  switch (part) {
    case 'sessions':
      part = 'schedule';
      break;
  }

  return part || 'home';
};
```

**Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/router.ts
git commit -m "feat: redirect /previous-speakers to /speakers"
```

---

### Task 5: Update Speakers Page — Add Past Speakers Section

**Files:**

- Modify: `src/pages/speakers-page.ts`

**Context:** The speakers page currently shows a grid of active speakers and a `<previous-speakers-block>` at the bottom. We replace the `<previous-speakers-block>` with an inline "Past Speakers" section that shows speakers with history, using the unified store selectors.

**Step 1: Update the speakers-page component**

In `src/pages/speakers-page.ts`:

1. Remove import of `'../elements/previous-speakers-block'` (line 12)
2. Replace import of `selectFilteredSpeakers` with both `selectFilteredSpeakers` and `selectPastSpeakers`:

   ```typescript
   import { selectFilteredSpeakers, selectPastSpeakers } from '../store/speakers/selectors';
   ```

3. Add a `pastSpeakers` property:

   ```typescript
   @property({ type: Array })
   private pastSpeakers: SpeakerWithTags[] = [];
   ```

4. In `stateChanged`, add:

   ```typescript
   this.pastSpeakers = selectPastSpeakers(state);
   ```

5. In the template, replace `<previous-speakers-block></previous-speakers-block>` (line 250) with a past speakers section:

   ```html
   <div class="container" hidden$="[[!pastSpeakers.length]]">
     <h1 class="container-title">Past Speakers</h1>
     <div class="container past-speakers-grid">
       <template is="dom-repeat" items="[[pastSpeakers]]" as="speaker">
         <a class="speaker card" href$="[[speakerUrl(speaker.id)]]">
           <div relative>
             <lazy-image
               class="photo"
               src="[[speaker.photoUrl]]"
               alt="[[speaker.name]]"
             ></lazy-image>
           </div>
           <div class="description">
             <h2 class="name">[[speaker.name]]</h2>
             <div class="origin">[[speaker.company]]</div>
           </div>
         </a>
       </template>
     </div>
   </div>
   ```

**Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/pages/speakers-page.ts
git commit -m "feat: add past speakers section to speakers page"
```

---

### Task 6: Update Speaker Detail Page — Add Past Talks Section

**Files:**

- Modify: `src/pages/speaker-page.ts`

**Context:** The speaker detail page currently shows the speaker's current sessions. We need to add a "Past Talks" section below that shows year-by-year history from `speaker.history`. Each year shows the company/title they had that year, plus their talks with tags and video/presentation links.

**Step 1: Update the speaker-page component**

In `src/pages/speaker-page.ts`:

1. Remove the import of `'../elements/previous-speakers-block'` (line 11)
2. Add import for `YearSnapshot`:

   ```typescript
   import { YearSnapshot } from '../models/previous-session';
   ```

3. Add styles for the history section (add inside the `<style>` tag):

   ```css
   .history-section {
     margin-top: 32px;
   }

   .year-block {
     margin-bottom: 24px;
   }

   .year-title {
     font-size: 18px;
     margin-bottom: 4px;
   }

   .year-meta {
     font-size: 14px;
     color: var(--secondary-text-color);
     margin-bottom: 8px;
   }
   ```

4. Replace the `<previous-speakers-block></previous-speakers-block>` line (224) with:

   ```html
   <div class="container content history-section" hidden$="[[!hasHistory]]">
     <h3>Past Talks</h3>
     <template is="dom-repeat" items="[[historyYears]]" as="yearData">
       <div class="year-block">
         <div class="year-title">[[yearData.year]]</div>
         <div class="year-meta">[[yearData.snapshot.title]], [[yearData.snapshot.company]]</div>
         <template is="dom-repeat" items="[[yearData.snapshot.talks]]" as="talk">
           <div class="section">
             <div class="section-primary-text">[[talk.title]]</div>
             <div class="tags" hidden$="[[!talk.tags.length]]">
               <template is="dom-repeat" items="[[talk.tags]]" as="tag">
                 <span class="tag" style$="color: [[getVariableColor(tag)]]">[[tag]]</span>
               </template>
             </div>
             <div class="actions" layout horizontal>
               <a
                 class="action"
                 href$="https://www.youtube.com/watch?v=[[talk.videoId]]"
                 hidden$="[[!talk.videoId]]"
                 target="_blank"
                 rel="noopener noreferrer"
                 layout
                 horizontal
                 center
               >
                 <iron-icon icon="hoverboard:video"></iron-icon>
                 <span>View video</span>
               </a>
               <a
                 class="action"
                 href$="[[talk.presentation]]"
                 hidden$="[[!talk.presentation]]"
                 target="_blank"
                 rel="noopener noreferrer"
                 layout
                 horizontal
                 center
               >
                 <iron-icon icon="hoverboard:presentation"></iron-icon>
                 <span>View presentation</span>
               </a>
             </div>
           </div>
         </template>
       </div>
     </template>
   </div>
   ```

5. Add computed properties:

   ```typescript
   @computed('speaker')
   get hasHistory(): boolean {
     return !!this.speaker?.history && Object.keys(this.speaker.history).length > 0;
   }

   @computed('speaker')
   get historyYears(): Array<{ year: string; snapshot: YearSnapshot }> {
     if (!this.speaker?.history) return [];
     return Object.entries(this.speaker.history)
       .map(([year, snapshot]) => ({ year, snapshot: snapshot as YearSnapshot }))
       .sort((a, b) => Number(b.year) - Number(a.year));
   }
   ```

**Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/pages/speaker-page.ts
git commit -m "feat: add past talks history section to speaker detail page"
```

---

### Task 7: Update Home Page — Conditional Speaker Blocks

**Files:**

- Modify: `src/pages/home-page.ts`
- Modify: `src/elements/speakers-block.ts`
- Modify: `src/elements/previous-speakers-block.ts`
- Modify: `src/elements/rotating-speakers-carousel.ts`

**Context:** The home page currently always shows `<previous-speakers-block is-home-page>`. The new behavior: show `<speakers-block>` if there are active featured speakers, otherwise fall back to the previous speakers carousel. The `previous-speakers-block` and `rotating-speakers-carousel` need to switch from reading the deleted `previousSpeakers` store to using the unified `speakers` store selectors.

**Step 1: Update `previous-speakers-block.ts`**

Replace all `previous-speakers` store imports with the unified speakers store:

```typescript
import { Failure, Initialized, Pending } from '@abraham/remotedata';
import { computed, customElement, property } from '@polymer/decorators';
import '@polymer/iron-icon';
import '@polymer/paper-button';
import { html, PolymerElement } from '@polymer/polymer';
import '@power-elements/lazy-image';
import { SpeakerWithTags } from '../models/speaker';
import { RootState, store } from '../store';
import { ReduxMixin } from '../store/mixin';
import { fetchSpeakers } from '../store/speakers/actions';
import { selectRandomPastSpeakers } from '../store/speakers/selectors';
import { initialSpeakersState, SpeakersState } from '../store/speakers/state';
import { loading, previousSpeakersBlock } from '../utils/data';
import '../utils/icons';
import './shared-styles';
import './rotating-speakers-carousel';
```

Update the class properties and methods:

- Change `previousSpeakers: PreviousSpeakersState` → `speakersState: SpeakersState = initialSpeakersState;`
- Change `speakers: PreviousSpeaker[]` → `speakers: SpeakerWithTags[]`
- Update `pending` and `failure` computed to use `speakersState`
- Update `stateChanged` to read from `state.speakers` and use `selectRandomPastSpeakers`
- Update `connectedCallback` to dispatch `fetchSpeakers`
- Change `previousSpeakerUrl` to return `/speakers/${id}` instead of using `router.urlForName('previous-speaker-page', { id })`
- Remove import of `router` if no longer needed

**Step 2: Update `rotating-speakers-carousel.ts`**

Change the `speakers` property type from `PreviousSpeaker[]` to `SpeakerWithTags[]`:

```typescript
import { SpeakerWithTags } from '../models/speaker';

// In the class:
@property({ type: Array })
speakers: SpeakerWithTags[] = [];
```

Update `_getSpeakerUrl` to return `/speakers/${id}` instead of `/previous-speakers/${id}`.

**Step 3: Update `speakers-block.ts`**

The `speakers-block` already reads from the unified speakers store and filters for `featured: true`. Verify it works correctly — no changes needed since it already uses `selectFilteredSpeakers` indirectly via `@computed`.

**Step 4: Update `home-page.ts`**

Replace the `<previous-speakers-block is-home-page>` (line 245) with both blocks, using Polymer conditional templates:

```html
<speakers-block></speakers-block> <previous-speakers-block is-home-page></previous-speakers-block>
```

The `speakers-block` already hides itself when there are no featured speakers (it renders an empty grid). The `previous-speakers-block` will show past speakers as a fallback.

Actually, for cleaner behavior, we should have the home page conditionally show one or the other. Since both are Polymer elements with their own Redux connections, the simplest approach is to keep both and let `speakers-block` show featured speakers (it handles empty state internally) and `previous-speakers-block` show past speakers below.

**Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```bash
git add src/pages/home-page.ts src/elements/speakers-block.ts src/elements/previous-speakers-block.ts src/elements/rotating-speakers-carousel.ts
git commit -m "feat: update home page blocks to use unified speakers store"
```

---

### Task 8: Delete Previous Speaker Pages & Models

**Files:**

- Delete: `src/pages/previous-speakers-page.ts`
- Delete: `src/pages/previous-speaker-page.ts`
- Delete: `src/models/previous-speaker.ts`
- Delete: `src/models/previous-speaker.test.ts`
- Delete: `src/models/previous-session.test.ts` (if it only tests old model)
- Modify: `src/components/hero/simple-hero.ts` — remove `previousSpeakers` from page type union

**Context:** These pages are no longer used since `/previous-speakers` routes now redirect to `/speakers`. The `PreviousSpeaker` model is replaced by the unified `Speaker` model with `history`.

**Step 1: Delete files**

Delete these files:

- `src/pages/previous-speakers-page.ts`
- `src/pages/previous-speaker-page.ts`
- `src/models/previous-speaker.ts`

**Step 2: Update simple-hero.ts**

In `src/components/hero/simple-hero.ts`, remove `'previousSpeakers'` from the page type union (line 10).

**Step 3: Check for remaining imports of deleted modules**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any remaining imports that reference deleted files. Common places:

- `src/elements/previous-speakers-block.ts` — should already be updated in Task 7
- `src/elements/rotating-speakers-carousel.ts` — should already be updated in Task 7

**Step 4: Delete test files if they only test old models**

Check `src/models/previous-speaker.test.ts` and `src/models/previous-session.test.ts`. If they test the old `PreviousSpeaker` interface, delete them. If `previous-session.test.ts` tests `PreviousSession` (which we're keeping), update it to match the new export.

**Step 5: Run type check and tests**

Run: `npx tsc --noEmit`
Run: `npx jest --testPathPattern=models`

**Step 6: Commit**

```bash
git add -u src/pages/previous-speakers-page.ts src/pages/previous-speaker-page.ts src/models/previous-speaker.ts src/models/previous-speaker.test.ts
git add src/components/hero/simple-hero.ts
git commit -m "feat: remove previous-speakers pages and old model"
```

---

### Task 9: Update Admin Panel — Speaker Schema + Remove Previous Speakers

**Files:**

- Modify: `src/pages/admin/schemas/index.ts`
- Modify: `src/pages/admin/admin-page.ts`
- Modify: `src/pages/admin/collections/previous-speakers-form.ts` → repurpose as speaker history form
- Modify: `firestore.rules`

**Context:** The admin panel has a separate "Previous Speakers" section. We remove it and add the `active` toggle + `history` editing to the speakers form. The existing `previous-speakers-form.ts` already has the year-grouped sessions UI — we repurpose it as the history editor within the speakers form.

**Step 1: Update speakers schema in `schemas/index.ts`**

Add `active` boolean field to the speakers schema fields array. Remove the `'previous-speakers'` schema entry entirely.

In the speakers `fields` array, add after the `featured` field:

```typescript
{ name: 'active', label: 'Active (speaking this year)', type: 'boolean' },
```

Also add to `listFields`:

```typescript
listFields: ['name', 'company', 'order', 'featured', 'active'],
```

Remove the entire `'previous-speakers'` key from `SCHEMAS`.

**Step 2: Update admin-page.ts**

In `src/pages/admin/admin-page.ts`:

1. Remove `{ label: 'Previous Speakers', path: 'previous-speakers' }` from `NAV_SECTIONS[0].items` (line 37)
2. Remove the `previous-speakers` section handling from `renderContent()` (lines 282-287)
3. The `previous-speakers-form.ts` import can be removed (line 10)

**Step 3: Repurpose `previous-speakers-form.ts` as history editor**

Rename the component to handle speaker history editing. The admin `speakers` form should include the history section. The cleanest approach: update the generic admin-form to handle the `history` field as a special case (similar to how schedule uses a custom form), OR integrate the year-group editing into the speakers section of admin-page.

For simplicity, add a custom speakers form that extends the generic form with history editing. Update `admin-page.ts` to route the speakers section to a custom form when editing:

In `renderContent()`, add a speakers special case before the generic fallback:

```typescript
if (this.currentSection === 'speakers') {
  if (this.currentView === 'list') {
    return html`<admin-list
      .schema=${SCHEMAS['speakers']}
      @admin-action=${this.handleAction}
    ></admin-list>`;
  }
  return html`<speakers-history-form
    editId="${this.currentEditId}"
    @admin-action=${this.handleAction}
  ></speakers-history-form>`;
}
```

Repurpose `previous-speakers-form.ts` → rename to `speakers-history-form.ts`. Update it to:

- Read from `speakers` collection instead of `previousSpeakers`
- Change `collectionPath` to `speakers` in `fetchDocument` and `saveDocument` calls
- Keep all the year-group session editing UI
- Add the `active` toggle field
- Keep all existing speaker profile fields (name, title, company, etc.)
- Change field name from `sessions` to `history` for the year-grouped data
- Update the `YearGroup` sessions format to include `bio`, `company`, `title` per year (the `YearSnapshot` format)

**Step 4: Update Firestore rules**

In `firestore.rules`, the `previousSpeakers` rules can stay for now (they'll be removed after migration verification). No new rules needed since `speakers` already has the right read/write rules.

**Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```bash
git add src/pages/admin/schemas/index.ts src/pages/admin/admin-page.ts src/pages/admin/collections/
git commit -m "feat: update admin panel for unified speakers with history editing"
```

---

### Task 10: Create Migration Script

**Files:**

- Create: `scripts/migrate-previous-speakers/index.ts`
- Modify: `package.json` (add npm script)

**Context:** This one-time script reads all `previousSpeakers` docs and merges them into the `speakers` collection. For each previous speaker: if a matching speaker already exists (by doc ID or name slug), merge the `sessions` data into that speaker's `history` field. If no match, create a new speaker doc with `active: false`. The `previousSpeakers` collection is left intact as a safety net.

**Step 1: Create migration script**

Create `scripts/migrate-previous-speakers/index.ts`:

```typescript
/**
 * One-time migration: copy previousSpeakers data into the unified speakers collection.
 *
 * Usage:
 *   npx ts-node-script scripts/migrate-previous-speakers
 *   npx ts-node-script scripts/migrate-previous-speakers --dry-run
 */

import { firestore } from '../firebase-config';

interface PreviousSession {
  title: string;
  tags?: string[];
  presentation?: string;
  videoId?: string;
}

interface YearSnapshot {
  bio: string;
  company: string;
  title: string;
  talks: PreviousSession[];
}

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.includes('--dry-run') };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  const { dryRun } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Fetch both collections
  console.log('Fetching previousSpeakers...');
  const prevSnapshot = await firestore.collection('previousSpeakers').get();
  console.log(`  Found ${prevSnapshot.size} previous speakers`);

  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  const speakersById = new Map<string, FirebaseFirestore.DocumentData>();
  speakersSnapshot.forEach((doc) => speakersById.set(doc.id, doc.data()));
  console.log(`  Found ${speakersById.size} current speakers`);

  // 2. Process each previous speaker
  let mergeCount = 0;
  let newCount = 0;
  const batch = firestore.batch();
  let batchOps = 0;

  prevSnapshot.forEach((doc) => {
    const prev = doc.data();
    const prevId = doc.id;
    const slug = toSlug(prev.name || '');

    // Check for existing speaker match
    const existingSpeaker = speakersById.get(prevId) ?? speakersById.get(slug);
    const targetId = speakersById.has(prevId) ? prevId : speakersById.has(slug) ? slug : prevId;

    // Convert previousSpeakers sessions format { [year]: PreviousSession[] }
    // to history format { [year]: YearSnapshot }
    const oldSessions = (prev.sessions || {}) as Record<string, PreviousSession[]>;
    const history: Record<string, YearSnapshot> = {};

    for (const [year, talks] of Object.entries(oldSessions)) {
      history[year] = {
        bio: prev.bio || '',
        company: prev.company || '',
        title: prev.title || '',
        talks: talks.map((t) => ({
          title: t.title,
          tags: t.tags || [],
          ...(t.presentation ? { presentation: t.presentation } : {}),
          ...(t.videoId ? { videoId: t.videoId } : {}),
        })),
      };
    }

    if (existingSpeaker) {
      // Merge: add history to existing speaker
      const existingHistory = (existingSpeaker.history || {}) as Record<string, YearSnapshot>;
      const mergedHistory = { ...existingHistory, ...history };

      console.log(
        `  [merge] ${prev.name} → speakers/${targetId} (${Object.keys(history).length} year(s))`,
      );
      if (!dryRun) {
        batch.update(firestore.collection('speakers').doc(targetId), { history: mergedHistory });
        batchOps++;
      }
      mergeCount++;
    } else {
      // New: create speaker doc with active=false
      const newDoc = {
        active: false,
        badges: [],
        bio: prev.bio || '',
        company: prev.company || '',
        companyLogo: prev.companyLogo || '',
        companyLogoUrl: prev.companyLogo || '',
        country: prev.country || '',
        featured: false,
        history,
        name: prev.name || '',
        order: prev.order || 0,
        photo: '',
        photoUrl: prev.photoUrl || '',
        shortBio: '',
        socials: prev.socials || [],
        title: prev.title || '',
      };

      console.log(
        `  [new]   ${prev.name} → speakers/${targetId} (${Object.keys(history).length} year(s))`,
      );
      if (!dryRun) {
        batch.set(firestore.collection('speakers').doc(targetId), newDoc);
        batchOps++;
      }
      newCount++;
    }
  });

  console.log(`\nSummary: ${mergeCount} merged, ${newCount} new`);

  if (!dryRun && batchOps > 0) {
    console.log(`\nCommitting ${batchOps} operations...`);
    await batch.commit();
    console.log('Done!');
  } else if (dryRun) {
    console.log('\n[dry-run] No changes written.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 2: Add npm script to `package.json`**

Add to the `scripts` section:

```json
"firestore:migrate-speakers": "ts-node-script ./scripts/migrate-previous-speakers",
```

**Step 3: Commit**

```bash
git add scripts/migrate-previous-speakers/index.ts package.json
git commit -m "feat: add one-time migration script for previousSpeakers to unified speakers"
```

---

### Task 11: Create Archive Script

**Files:**

- Create: `scripts/archive-speakers/index.ts`
- Modify: `package.json` (add npm script)

**Context:** This yearly script snapshots current active speakers into their `history` field, then sets `active: false` and `featured: false`. It also optionally clears the `sessions` and `schedule` collections. Run after each conference to prepare for the next year's lineup.

**Step 1: Create archive script**

Create `scripts/archive-speakers/index.ts`:

```typescript
/**
 * Archive active speakers into their history, then deactivate them.
 *
 * Usage:
 *   npx ts-node-script scripts/archive-speakers --year 2025
 *   npx ts-node-script scripts/archive-speakers --year 2025 --dry-run
 *   npx ts-node-script scripts/archive-speakers --year 2025 --clear
 *
 * Flags:
 *   --year <YYYY>   (required) The conference year to archive under
 *   --dry-run       Preview without writing
 *   --clear         Also delete sessions and schedule collections after archiving
 */

import { firestore } from '../firebase-config';

interface SessionDoc {
  description: string;
  presentation?: string;
  speakers?: string[];
  tags?: string[];
  title: string;
  videoId?: string;
  [key: string]: unknown;
}

interface YearSnapshot {
  bio: string;
  company: string;
  title: string;
  talks: Array<{
    title: string;
    tags: string[];
    presentation?: string;
    videoId?: string;
  }>;
}

function parseArgs(): { year: string; dryRun: boolean; clear: boolean } {
  const args = process.argv.slice(2);
  let year = '';
  let dryRun = false;
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--year' && args[i + 1]) {
      year = args[i + 1]!;
      i++;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--clear') {
      clear = true;
    }
  }

  if (!year || !/^\d{4}$/.test(year)) {
    console.error(
      'Usage: npx ts-node-script scripts/archive-speakers --year <YYYY> [--dry-run] [--clear]',
    );
    process.exit(1);
  }

  return { year, dryRun, clear };
}

async function deleteCollection(collectionPath: string, dryRun: boolean): Promise<number> {
  const snapshot = await firestore.collection(collectionPath).get();
  if (snapshot.empty) return 0;

  if (dryRun) {
    console.log(`  Would delete ${snapshot.size} docs from ${collectionPath}`);
    return snapshot.size;
  }

  const batchSize = 500;
  let deleted = 0;
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = firestore.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }
  console.log(`  Deleted ${deleted} docs from ${collectionPath}`);
  return deleted;
}

async function main() {
  const { year, dryRun, clear } = parseArgs();
  if (dryRun) console.log('=== DRY RUN ===\n');

  // 1. Fetch active speakers and sessions
  console.log('Fetching speakers...');
  const speakersSnapshot = await firestore.collection('speakers').get();
  const activeSpeakers: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = [];
  speakersSnapshot.forEach((doc) => {
    if (doc.data().active) {
      activeSpeakers.push({ id: doc.id, data: doc.data() });
    }
  });
  console.log(`  Found ${activeSpeakers.length} active speakers (${speakersSnapshot.size} total)`);

  console.log('Fetching sessions...');
  const sessionsSnapshot = await firestore.collection('sessions').get();
  const sessions = new Map<string, SessionDoc>();
  sessionsSnapshot.forEach((doc) => sessions.set(doc.id, doc.data() as SessionDoc));
  console.log(`  Found ${sessions.size} sessions`);

  if (activeSpeakers.length === 0) {
    console.log('\nNo active speakers to archive. Exiting.');
    process.exit(0);
  }

  // 2. Build speaker → sessions map
  const speakerSessions = new Map<string, SessionDoc[]>();
  for (const [, session] of sessions) {
    if (!session.speakers) continue;
    for (const speakerId of session.speakers) {
      const existing = speakerSessions.get(speakerId) ?? [];
      existing.push(session);
      speakerSessions.set(speakerId, existing);
    }
  }

  // 3. Archive each active speaker
  console.log(`\nArchiving ${activeSpeakers.length} speakers under year "${year}":\n`);
  const batch = firestore.batch();
  let ops = 0;

  for (const { id, data } of activeSpeakers) {
    const talks = (speakerSessions.get(id) ?? []).map((s) => {
      const talk: { title: string; tags: string[]; presentation?: string; videoId?: string } = {
        title: s.title,
        tags: s.tags ?? [],
      };
      if (s.presentation) talk.presentation = s.presentation;
      if (s.videoId) talk.videoId = s.videoId;
      return talk;
    });

    const snapshot: YearSnapshot = {
      bio: data.bio || '',
      company: data.company || '',
      title: data.title || '',
      talks,
    };

    const existingHistory = (data.history || {}) as Record<string, YearSnapshot>;
    const updatedHistory = { ...existingHistory, [year]: snapshot };

    console.log(`  ${data.name} — ${talks.length} talk(s)`);

    if (!dryRun) {
      batch.update(firestore.collection('speakers').doc(id), {
        active: false,
        featured: false,
        history: updatedHistory,
      });
      ops++;
    }
  }

  if (!dryRun && ops > 0) {
    console.log(`\nCommitting ${ops} updates...`);
    await batch.commit();
    console.log('Speakers archived.');
  } else if (dryRun) {
    console.log(`\n[dry-run] Would update ${ops} speaker docs.`);
  }

  // 4. Optionally clear sessions and schedule
  if (clear) {
    console.log('\nClearing collections...');
    await deleteCollection('sessions', dryRun);
    await deleteCollection('schedule', dryRun);
    console.log('Done clearing.');
  }

  console.log('\nArchive complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Archive failed:', err);
  process.exit(1);
});
```

**Step 2: Add npm script to `package.json`**

Add to the `scripts` section:

```json
"firestore:archive-speakers": "ts-node-script ./scripts/archive-speakers",
```

**Step 3: Commit**

```bash
git add scripts/archive-speakers/index.ts package.json
git commit -m "feat: add yearly archive script for speakers"
```

---

### Task 12: Fix Remaining Type Errors & Clean Up

**Files:**

- Various — whatever `tsc --noEmit` reports

**Context:** After all the above changes, there may be remaining type errors from the model changes. This task is a sweep to fix everything and ensure clean compilation.

**Step 1: Run full type check**

Run: `npx tsc --noEmit 2>&1`

Fix all remaining errors. Common issues:

- Files importing `PreviousSpeaker` that should use `SpeakerWithTags`
- Missing `active` or `history` fields in test fixtures or mock data
- `src/__mocks__/firebase.ts` may need updates
- Any references to `state.previousSpeakers` in Redux

**Step 2: Run tests**

Run: `npx jest`

Fix any test failures related to the model changes.

**Step 3: Update `src/utils/data.ts`**

If `previousSpeakersBlock` is still exported and used (in the `previous-speakers-block` element), keep it. Otherwise remove.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve remaining type errors from unified speakers migration"
```

---

### Task 13: Update Firestore Rules

**Files:**

- Modify: `firestore.rules`

**Context:** After migration is verified, remove the `previousSpeakers` rules. The `speakers` collection already has correct rules. Also ensure `generatedSpeakers` allows public read (it already does via `allow get; allow list;`).

**Step 1: Keep `previousSpeakers` rules for now**

During migration, keep the `previousSpeakers` rules as-is. They can be removed in a future cleanup after verifying the migration worked.

No changes needed in this task — this is a reminder for post-migration cleanup.

**Step 2: Commit (if any changes)**

No commit needed for this task.

---

## Execution Order

Tasks 1-8 are the core migration (model → store → function → router → pages → cleanup). Tasks 9-11 are the admin panel and scripts. Task 12 is the integration sweep. Task 13 is post-deploy cleanup.

Dependencies:

- Task 1 (model) must come first
- Task 2 (store) depends on Task 1
- Task 3 (function) is independent of 2 but depends on 1
- Tasks 4-8 depend on Tasks 1 and 2
- Task 9 (admin) depends on Task 1
- Tasks 10-11 (scripts) depend on Task 1
- Task 12 depends on all others
