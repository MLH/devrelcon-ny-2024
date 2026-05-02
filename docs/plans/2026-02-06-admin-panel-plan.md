# Admin Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/admin` route inside the existing app providing form-based CRUD for all Firestore collections, with image uploads and a schedule editor.

**Architecture:** Lit + Shoelace web components, living under `src/pages/admin/`. A generic form renderer and list component driven by schema definitions reduce per-collection boilerplate. Auth gate checks `@majorleaguehacking.com` domain on the Firebase user. Image uploads go to Firebase Storage with auto-optimization via the existing `optimize-images` Cloud Function.

**Tech Stack:** Lit 3, Shoelace 2.x, Firebase Firestore SDK (setDoc/deleteDoc/getDocs/onSnapshot), Firebase Storage SDK, Firebase Auth

---

### Task 1: Install Shoelace and Configure Base Path

**Files:**

- Modify: `package.json` (add dependency)
- Create: `src/pages/admin/shoelace-setup.ts`

**Step 1: Install Shoelace**

Run: `npm install @shoelace-style/shoelace`

**Step 2: Create Shoelace setup file**

Create `src/pages/admin/shoelace-setup.ts`:

```typescript
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

// Use CDN for icons/assets so we don't need to copy them to dist/
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/');
```

**Step 3: Commit**

```bash
git add package.json package-lock.json src/pages/admin/shoelace-setup.ts
git commit -m "feat(admin): install Shoelace and configure base path"
```

---

### Task 2: Admin Auth Gate and Page Shell

**Files:**

- Create: `src/pages/admin/admin-page.ts`
- Modify: `src/router.ts`

**Step 1: Create the admin page shell with auth gate**

Create `src/pages/admin/admin-page.ts`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseApp } from '../../firebase.js';
import './shoelace-setup.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

const auth = getAuth(firebaseApp);

const NAV_SECTIONS = [
  {
    label: 'Content',
    items: [
      { label: 'Speakers', path: 'speakers' },
      { label: 'Sessions', path: 'sessions' },
      { label: 'Schedule', path: 'schedule' },
      { label: 'Previous Speakers', path: 'previous-speakers' },
    ],
  },
  {
    label: 'Event',
    items: [
      { label: 'Tickets', path: 'tickets' },
      { label: 'Partners', path: 'partners' },
      { label: 'Team', path: 'team' },
      { label: 'Videos', path: 'videos' },
      { label: 'Gallery', path: 'gallery' },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Blog', path: 'blog' },
      { label: 'Config', path: 'config' },
    ],
  },
];

@customElement('admin-page')
export class AdminPage extends LitElement {
  @state() private user: User | null = null;
  @state() private authChecked = false;
  @state() private currentSection = 'speakers';

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
    }

    .layout {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 240px;
      background: var(--sl-color-neutral-50, #f8f9fa);
      border-right: 1px solid var(--sl-color-neutral-200, #e2e8f0);
      padding: 16px;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .sidebar h2 {
      font-size: 18px;
      margin: 0 0 16px 0;
      color: var(--sl-color-neutral-900);
    }

    .sidebar h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sl-color-neutral-500);
      margin: 16px 0 4px 0;
    }

    .nav-item {
      display: block;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--sl-color-neutral-700);
      text-decoration: none;
      font-size: 14px;
    }

    .nav-item:hover {
      background: var(--sl-color-neutral-100);
    }

    .nav-item.active {
      background: var(--sl-color-primary-100);
      color: var(--sl-color-primary-700);
      font-weight: 600;
    }

    .main {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .user-info {
      font-size: 12px;
      color: var(--sl-color-neutral-500);
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--sl-color-neutral-200);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      this.authChecked = true;
    });
  }

  private get isAuthorized(): boolean {
    return !!this.user?.email?.endsWith('@majorleaguehacking.com');
  }

  override render() {
    if (!this.authChecked) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    if (!this.user) {
      return html`
        <div class="denied">
          <sl-alert variant="warning" open>
            <sl-icon slot="icon" name="lock"></sl-icon>
            Please sign in to access the admin panel.
          </sl-alert>
          <sl-button variant="primary" @click=${() => (window.location.href = '/')}
            >Go to Home</sl-button
          >
        </div>
      `;
    }

    if (!this.isAuthorized) {
      return html`
        <div class="denied">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="shield-x"></sl-icon>
            Access denied. Admin panel is restricted to @majorleaguehacking.com accounts.
          </sl-alert>
          <sl-button variant="primary" @click=${() => (window.location.href = '/')}
            >Go to Home</sl-button
          >
        </div>
      `;
    }

    return html`
      <div class="layout">
        <nav class="sidebar">
          <h2>Admin</h2>
          ${NAV_SECTIONS.map(
            (section) => html`
              <h3>${section.label}</h3>
              ${section.items.map(
                (item) => html`
                  <a
                    class="nav-item ${this.currentSection === item.path ? 'active' : ''}"
                    @click=${() => this.navigate(item.path)}
                  >
                    ${item.label}
                  </a>
                `,
              )}
            `,
          )}
          <div class="user-info">${this.user.email}</div>
        </nav>
        <div class="main">
          <slot></slot>
        </div>
      </div>
    `;
  }

  private navigate(path: string) {
    this.currentSection = path;
    window.history.pushState({}, '', `/admin/${path}`);
    this.dispatchEvent(
      new CustomEvent('admin-navigate', { detail: { path }, bubbles: true, composed: true }),
    );
  }
}
```

**Step 2: Add admin route to router**

In `src/router.ts`, add to the ROUTES array before the catch-all `(.*)` route:

```typescript
{
  path: '/admin',
  component: 'admin-page',
  action: async () => {
    await import('./pages/admin/admin-page.js');
  },
  children: [
    {
      path: '/:section?',
      component: 'admin-page',
      action: async () => {
        await import('./pages/admin/admin-page.js');
      },
    },
  ],
},
```

**Step 3: Verify the auth gate works**

Run: `npm start`
Navigate to `http://localhost:5000/admin` — should see sign-in prompt.
Sign in with an MLH account — should see the sidebar layout.

**Step 4: Commit**

```bash
git add src/pages/admin/admin-page.ts src/router.ts
git commit -m "feat(admin): add admin page shell with MLH domain auth gate"
```

---

### Task 3: Firestore CRUD Utility Module

**Files:**

- Create: `src/pages/admin/admin-firestore.ts`

**Step 1: Create the admin Firestore CRUD utility**

This module provides generic CRUD operations used by all collection editors. It directly imports `db` from the existing `firebase.ts`.

Create `src/pages/admin/admin-firestore.ts`:

```typescript
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase.js';

export interface DocWithId {
  id: string;
  [key: string]: unknown;
}

/** Fetch all documents in a collection, ordered by a field. */
export const fetchCollection = async (path: string, orderField = 'order'): Promise<DocWithId[]> => {
  const q = query(collection(db, path), orderBy(orderField));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
};

/** Subscribe to a collection in real-time. Returns unsubscribe function. */
export const subscribeCollection = (
  path: string,
  orderField: string,
  callback: (docs: DocWithId[]) => void,
): Unsubscribe => {
  const q = query(collection(db, path), orderBy(orderField));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  });
};

/** Fetch a single document by path and ID. */
export const fetchDocument = async (path: string, id: string): Promise<DocWithId | null> => {
  const snapshot = await getDoc(doc(db, path, id));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id };
};

/** Create or update a document. If id is provided, uses setDoc. */
export const saveDocument = async (
  path: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  // Remove the `id` field from data before writing (it's the doc key, not a field)
  const { id: _id, ...writeData } = data;
  await setDoc(doc(db, path, id), writeData);
};

/** Delete a document. */
export const removeDocument = async (path: string, id: string): Promise<void> => {
  await deleteDoc(doc(db, path, id));
};

/** Fetch subcollection documents. */
export const fetchSubcollection = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  orderField = 'order',
): Promise<DocWithId[]> => {
  const q = query(collection(db, parentPath, parentId, subcollection), orderBy(orderField));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
};

/** Save a subcollection document. */
export const saveSubcollectionDoc = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const { id: _id, ...writeData } = data;
  await setDoc(doc(db, parentPath, parentId, subcollection, docId), writeData);
};

/** Delete a subcollection document. */
export const removeSubcollectionDoc = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  docId: string,
): Promise<void> => {
  await deleteDoc(doc(db, parentPath, parentId, subcollection, docId));
};

/** Generate a new document ID (zero-padded, next available). */
export const nextPaddedId = (existingIds: string[], padLength = 3): string => {
  const maxNum = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, -1);
  return String(maxNum + 1).padStart(padLength, '0');
};
```

**Step 2: Commit**

```bash
git add src/pages/admin/admin-firestore.ts
git commit -m "feat(admin): add generic Firestore CRUD utilities"
```

---

### Task 4: Image Upload Component

**Files:**

- Create: `src/pages/admin/admin-image-upload.ts`
- Modify: `storage.rules`

**Step 1: Update Storage rules**

Replace the contents of `storage.rules` with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /admin-uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email.matches('.*@majorleaguehacking[.]com$');
    }
    match /{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Step 2: Create the image upload component**

Create `src/pages/admin/admin-image-upload.ts`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../../firebase.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

const storage = getStorage(firebaseApp);

@customElement('admin-image-upload')
export class AdminImageUpload extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) collection = '';
  @property({ type: String }) label = 'Image';

  @state() private uploading = false;
  @state() private progress = 0;

  static override styles = css`
    :host {
      display: block;
    }

    .upload-area {
      border: 2px dashed var(--sl-color-neutral-300);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .upload-area:hover {
      border-color: var(--sl-color-primary-500);
    }

    .preview {
      margin-top: 8px;
    }

    .preview img {
      max-width: 200px;
      max-height: 150px;
      border-radius: 4px;
      object-fit: cover;
    }

    .preview-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--sl-color-neutral-700);
    }

    input[type='file'] {
      display: none;
    }
  `;

  override render() {
    return html`
      <label>${this.label}</label>
      ${this.value
        ? html`
            <div class="preview-row">
              <div class="preview">
                <img src="${this.value}" alt="Preview" />
              </div>
              <sl-button size="small" @click=${this.pickFile}>Replace</sl-button>
            </div>
          `
        : html`
            <div class="upload-area" @click=${this.pickFile}>
              <sl-icon name="cloud-upload" style="font-size: 24px;"></sl-icon>
              <div>Click to upload</div>
            </div>
          `}
      ${this.uploading
        ? html`<sl-progress-bar
            value="${this.progress}"
            style="margin-top: 8px;"
          ></sl-progress-bar>`
        : ''}
      <input type="file" accept="image/*" @change=${this.handleFile} />
    `;
  }

  private pickFile() {
    this.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!.click();
  }

  private handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `admin-uploads/${this.collection}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    this.uploading = true;
    this.progress = 0;

    task.on(
      'state_changed',
      (snapshot) => {
        this.progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        console.error('Upload failed:', error);
        this.uploading = false;
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        this.value = url;
        this.uploading = false;
        this.dispatchEvent(
          new CustomEvent('image-uploaded', {
            detail: { url },
            bubbles: true,
            composed: true,
          }),
        );
      },
    );

    // Reset file input so the same file can be re-selected
    input.value = '';
  }
}
```

**Step 3: Commit**

```bash
git add src/pages/admin/admin-image-upload.ts storage.rules
git commit -m "feat(admin): add image upload component and storage rules"
```

---

### Task 5: Schema Definitions

**Files:**

- Create: `src/pages/admin/schemas/index.ts`

**Step 1: Create the schema definition file**

This defines the field schemas for every collection. The generic form renderer uses these to generate the appropriate Shoelace inputs.

Create `src/pages/admin/schemas/index.ts`:

```typescript
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'textarea'
  | 'image'
  | 'select'
  | 'multiselect'
  | 'socials'
  | 'badges'
  | 'date'
  | 'time';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** For 'image' type: which collection folder to upload to */
  uploadCollection?: string;
  /** Placeholder text */
  placeholder?: string;
}

export interface CollectionSchema {
  /** Firestore collection path */
  collectionPath: string;
  /** Human-readable name */
  displayName: string;
  /** Field to order list by */
  orderField: string;
  /** Fields to show in list table */
  listFields: string[];
  /** Full field schema for the edit form */
  fields: FieldSchema[];
  /** How to generate doc IDs: 'slug' from name, 'padded' zero-padded number, 'input' user-provided */
  idStrategy: 'slug' | 'padded' | 'input' | 'date';
  /** Field to derive slug from (for idStrategy: 'slug') */
  slugField?: string;
}

const COMPLEXITY_OPTIONS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
];

const LANGUAGE_OPTIONS = [{ value: 'English', label: 'English' }];

export const SCHEMAS: Record<string, CollectionSchema> = {
  speakers: {
    collectionPath: 'speakers',
    displayName: 'Speakers',
    orderField: 'order',
    listFields: ['name', 'company', 'order', 'featured'],
    idStrategy: 'slug',
    slugField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'title', label: 'Job Title', type: 'string', required: true },
      { name: 'company', label: 'Company', type: 'string', required: true },
      { name: 'country', label: 'Country', type: 'string' },
      { name: 'pronouns', label: 'Pronouns', type: 'string', placeholder: 'e.g. she/her' },
      { name: 'bio', label: 'Bio', type: 'textarea', required: true },
      { name: 'shortBio', label: 'Short Bio', type: 'textarea' },
      { name: 'photo', label: 'Photo Path', type: 'string' },
      { name: 'photoUrl', label: 'Photo', type: 'image', uploadCollection: 'speakers' },
      { name: 'companyLogo', label: 'Company Logo Path', type: 'string' },
      {
        name: 'companyLogoUrl',
        label: 'Company Logo',
        type: 'image',
        uploadCollection: 'speakers',
      },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'featured', label: 'Featured', type: 'boolean' },
      { name: 'socials', label: 'Social Links', type: 'socials' },
      { name: 'badges', label: 'Badges', type: 'badges' },
    ],
  },

  sessions: {
    collectionPath: 'sessions',
    displayName: 'Sessions',
    orderField: 'title',
    listFields: ['title', 'complexity', 'language'],
    idStrategy: 'input',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'speakers', label: 'Speakers', type: 'multiselect' },
      { name: 'tags', label: 'Tags', type: 'multiselect' },
      { name: 'complexity', label: 'Complexity', type: 'select', options: COMPLEXITY_OPTIONS },
      { name: 'language', label: 'Language', type: 'select', options: LANGUAGE_OPTIONS },
      { name: 'presentation', label: 'Presentation URL', type: 'string' },
      { name: 'videoId', label: 'YouTube Video ID', type: 'string' },
      { name: 'image', label: 'Image URL', type: 'string' },
      { name: 'icon', label: 'Icon', type: 'string' },
      { name: 'extend', label: 'Extend (timeslots)', type: 'number' },
    ],
  },

  tickets: {
    collectionPath: 'tickets',
    displayName: 'Tickets',
    orderField: 'order',
    listFields: ['name', 'price', 'available', 'soldOut'],
    idStrategy: 'padded',
    fields: [
      { name: 'name', label: 'Ticket Name', type: 'string', required: true },
      { name: 'price', label: 'Price', type: 'number', required: true },
      {
        name: 'currency',
        label: 'Currency Symbol',
        type: 'string',
        required: true,
        placeholder: '$',
      },
      { name: 'url', label: 'Purchase URL', type: 'string', required: true },
      { name: 'info', label: 'Info Text', type: 'string' },
      { name: 'order', label: 'Display Order', type: 'number' },
      { name: 'available', label: 'Available', type: 'boolean' },
      { name: 'soldOut', label: 'Sold Out', type: 'boolean' },
      { name: 'primary', label: 'Primary Ticket', type: 'boolean' },
      { name: 'regular', label: 'Regular Tier', type: 'boolean' },
      { name: 'inDemand', label: 'In Demand', type: 'boolean' },
      { name: 'scholarship', label: 'Scholarship', type: 'boolean' },
      { name: 'starts', label: 'Available From', type: 'string', placeholder: 'YYYY-MM-DD' },
      { name: 'ends', label: 'Available Until', type: 'string', placeholder: 'YYYY-MM-DD' },
    ],
  },

  'partner-groups': {
    collectionPath: 'partners',
    displayName: 'Partner Groups',
    orderField: 'order',
    listFields: ['title', 'order'],
    idStrategy: 'padded',
    fields: [
      {
        name: 'title',
        label: 'Group Title',
        type: 'string',
        required: true,
        placeholder: 'e.g. Gold Partners',
      },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
    ],
  },

  'partner-items': {
    collectionPath: 'partners',
    displayName: 'Partner',
    orderField: 'order',
    listFields: ['name', 'order'],
    idStrategy: 'padded',
    fields: [
      { name: 'name', label: 'Partner Name', type: 'string', required: true },
      { name: 'logoUrl', label: 'Logo', type: 'image', uploadCollection: 'partners' },
      { name: 'url', label: 'Website URL', type: 'string', required: true },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
    ],
  },

  'team-groups': {
    collectionPath: 'team',
    displayName: 'Teams',
    orderField: 'title',
    listFields: ['title'],
    idStrategy: 'padded',
    fields: [
      {
        name: 'title',
        label: 'Team Name',
        type: 'string',
        required: true,
        placeholder: 'e.g. Organizers',
      },
    ],
  },

  'team-members': {
    collectionPath: 'team',
    displayName: 'Team Member',
    orderField: 'order',
    listFields: ['name', 'title', 'order'],
    idStrategy: 'padded',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'title', label: 'Role / Title', type: 'string', required: true },
      { name: 'photo', label: 'Photo Path', type: 'string' },
      { name: 'photoUrl', label: 'Photo', type: 'image', uploadCollection: 'team' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'socials', label: 'Social Links', type: 'socials' },
    ],
  },

  'previous-speakers': {
    collectionPath: 'previousSpeakers',
    displayName: 'Previous Speakers',
    orderField: 'order',
    listFields: ['name', 'company', 'order'],
    idStrategy: 'slug',
    slugField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'title', label: 'Job Title', type: 'string' },
      { name: 'company', label: 'Company', type: 'string' },
      { name: 'country', label: 'Country', type: 'string' },
      { name: 'bio', label: 'Bio', type: 'textarea' },
      { name: 'photoUrl', label: 'Photo', type: 'image', uploadCollection: 'previous-speakers' },
      { name: 'companyLogo', label: 'Company Logo URL', type: 'string' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'socials', label: 'Social Links', type: 'socials' },
    ],
  },

  videos: {
    collectionPath: 'videos',
    displayName: 'Videos',
    orderField: 'order',
    listFields: ['title', 'speakers'],
    idStrategy: 'padded',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      { name: 'speakers', label: 'Speaker Names', type: 'string' },
      { name: 'youtubeId', label: 'YouTube Video ID', type: 'string', required: true },
      { name: 'thumbnail', label: 'Thumbnail URL', type: 'string' },
      { name: 'order', label: 'Display Order', type: 'number' },
    ],
  },

  gallery: {
    collectionPath: 'gallery',
    displayName: 'Gallery',
    orderField: 'order',
    listFields: ['url', 'order'],
    idStrategy: 'padded',
    fields: [
      { name: 'url', label: 'Image', type: 'image', uploadCollection: 'gallery' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
    ],
  },

  blog: {
    collectionPath: 'blog',
    displayName: 'Blog Posts',
    orderField: 'published',
    listFields: ['title', 'published'],
    idStrategy: 'slug',
    slugField: 'title',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      { name: 'brief', label: 'Brief Summary', type: 'textarea', required: true },
      { name: 'content', label: 'Content (HTML)', type: 'textarea', required: true },
      { name: 'image', label: 'Featured Image', type: 'image', uploadCollection: 'blog' },
      {
        name: 'published',
        label: 'Publish Date',
        type: 'string',
        required: true,
        placeholder: 'YYYY-MM-DD',
      },
      {
        name: 'backgroundColor',
        label: 'Background Color',
        type: 'string',
        placeholder: '#ffffff',
      },
      { name: 'source', label: 'Source Path', type: 'string' },
    ],
  },

  config: {
    collectionPath: 'config',
    displayName: 'Config',
    orderField: '__name__',
    listFields: ['id'],
    idStrategy: 'input',
    fields: [],
  },
};

/** Generate a slug from a string (lowercase, underscores, no special chars). */
export const toSlug = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};
```

**Step 2: Commit**

```bash
git add src/pages/admin/schemas/index.ts
git commit -m "feat(admin): add collection field schemas"
```

---

### Task 6: Generic Admin List Component

**Files:**

- Create: `src/pages/admin/admin-list.ts`

**Step 1: Create the generic list component**

This renders a Shoelace table for any collection, using the schema to determine columns.

Create `src/pages/admin/admin-list.ts`:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CollectionSchema } from './schemas/index.js';
import { DocWithId, fetchCollection, removeDocument } from './admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

@customElement('admin-list')
export class AdminList extends LitElement {
  @property({ type: Object }) schema!: CollectionSchema;
  @property({ type: String }) parentPath = '';
  @property({ type: String }) parentId = '';
  @property({ type: String }) subcollection = '';

  @state() private items: DocWithId[] = [];
  @state() private loading = true;
  @state() private deleteTarget: DocWithId | null = null;

  static override styles = css`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 24px;
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--sl-color-neutral-200);
      font-size: 14px;
    }

    th {
      font-weight: 600;
      color: var(--sl-color-neutral-600);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    tr:hover td {
      background: var(--sl-color-neutral-50);
    }

    .actions {
      display: flex;
      gap: 4px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty {
      text-align: center;
      padding: 40px;
      color: var(--sl-color-neutral-500);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private get collectionPath(): string {
    if (this.subcollection && this.parentPath && this.parentId) {
      return `${this.parentPath}/${this.parentId}/${this.subcollection}`;
    }
    return this.schema.collectionPath;
  }

  async loadData() {
    this.loading = true;
    try {
      this.items = await fetchCollection(this.collectionPath, this.schema.orderField);
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
    this.loading = false;
  }

  override render() {
    return html`
      <div class="header">
        <h1>${this.schema.displayName}</h1>
        <sl-button variant="primary" @click=${this.handleNew}>
          <sl-icon slot="prefix" name="plus-lg"></sl-icon>
          New
        </sl-button>
      </div>

      ${this.loading
        ? html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`
        : this.items.length === 0
          ? html`<div class="empty">No items yet. Click "New" to create one.</div>`
          : html`
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    ${this.schema.listFields.map((f) => html`<th>${f}</th>`)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.items.map(
                    (item) => html`
                      <tr>
                        <td>${item.id}</td>
                        ${this.schema.listFields.map(
                          (f) => html` <td>${this.renderFieldValue(item[f])}</td> `,
                        )}
                        <td class="actions">
                          <sl-icon-button
                            name="pencil"
                            label="Edit"
                            @click=${() => this.handleEdit(item)}
                          ></sl-icon-button>
                          <sl-icon-button
                            name="trash"
                            label="Delete"
                            style="color: var(--sl-color-danger-600);"
                            @click=${() => (this.deleteTarget = item)}
                          ></sl-icon-button>
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            `}

      <sl-dialog
        label="Confirm Delete"
        ?open=${this.deleteTarget !== null}
        @sl-after-hide=${() => (this.deleteTarget = null)}
      >
        Are you sure you want to delete "${this.deleteTarget?.id}"?
        <sl-button slot="footer" variant="default" @click=${() => (this.deleteTarget = null)}
          >Cancel</sl-button
        >
        <sl-button slot="footer" variant="danger" @click=${this.handleDelete}>Delete</sl-button>
      </sl-dialog>
    `;
  }

  private renderFieldValue(value: unknown): unknown {
    if (typeof value === 'boolean') {
      return html`<sl-badge variant="${value ? 'success' : 'neutral'}"
        >${value ? 'Yes' : 'No'}</sl-badge
      >`;
    }
    if (Array.isArray(value)) {
      return value.length + ' items';
    }
    return value ?? '';
  }

  private handleNew() {
    this.dispatchEvent(
      new CustomEvent('admin-action', { detail: { action: 'new' }, bubbles: true, composed: true }),
    );
  }

  private handleEdit(item: DocWithId) {
    this.dispatchEvent(
      new CustomEvent('admin-action', {
        detail: { action: 'edit', id: item.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleDelete() {
    if (!this.deleteTarget) return;
    try {
      await removeDocument(this.collectionPath, this.deleteTarget.id);
      this.deleteTarget = null;
      await this.loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/admin-list.ts
git commit -m "feat(admin): add generic list/table component"
```

---

### Task 7: Repeater Component (for socials, badges)

**Files:**

- Create: `src/pages/admin/admin-repeater.ts`

**Step 1: Create the repeater component**

Create `src/pages/admin/admin-repeater.ts`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

export interface RepeaterField {
  name: string;
  label: string;
  placeholder?: string;
}

@customElement('admin-repeater')
export class AdminRepeater extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Array }) fields: RepeaterField[] = [];
  @property({ type: Array }) value: Record<string, string>[] = [];

  static override styles = css`
    :host {
      display: block;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--sl-color-neutral-700);
    }

    .row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .row sl-input {
      flex: 1;
    }

    .add-btn {
      margin-top: 4px;
    }
  `;

  override render() {
    return html`
      <label>${this.label}</label>
      ${(this.value || []).map(
        (item, index) => html`
          <div class="row">
            ${this.fields.map(
              (field) => html`
                <sl-input
                  size="small"
                  placeholder="${field.placeholder || field.label}"
                  value="${item[field.name] || ''}"
                  @sl-change=${(e: Event) =>
                    this.updateField(index, field.name, (e.target as HTMLInputElement).value)}
                ></sl-input>
              `,
            )}
            <sl-icon-button
              name="x-lg"
              label="Remove"
              @click=${() => this.removeRow(index)}
            ></sl-icon-button>
          </div>
        `,
      )}
      <sl-button class="add-btn" size="small" @click=${this.addRow}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add ${this.label}
      </sl-button>
    `;
  }

  private updateField(index: number, field: string, value: string) {
    const updated = [...this.value];
    updated[index] = { ...updated[index], [field]: value };
    this.value = updated;
    this.emitChange();
  }

  private addRow() {
    const empty: Record<string, string> = {};
    this.fields.forEach((f) => (empty[f.name] = ''));
    this.value = [...(this.value || []), empty];
    this.emitChange();
  }

  private removeRow(index: number) {
    this.value = this.value.filter((_, i) => i !== index);
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/admin-repeater.ts
git commit -m "feat(admin): add repeater component for arrays of objects"
```

---

### Task 8: Generic Admin Form Component

**Files:**

- Create: `src/pages/admin/admin-form.ts`

**Step 1: Create the generic form renderer**

This takes a schema and data object, renders all appropriate Shoelace form fields, and handles save/cancel.

Create `src/pages/admin/admin-form.ts`:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CollectionSchema, FieldSchema, toSlug } from './schemas/index.js';
import {
  DocWithId,
  fetchCollection,
  fetchDocument,
  saveDocument,
  nextPaddedId,
} from './admin-firestore.js';
import './admin-image-upload.js';
import './admin-repeater.js';
import { RepeaterField } from './admin-repeater.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

const SOCIAL_FIELDS: RepeaterField[] = [
  { name: 'name', label: 'Platform', placeholder: 'e.g. twitter' },
  { name: 'link', label: 'URL', placeholder: 'https://...' },
  { name: 'icon', label: 'Icon', placeholder: 'e.g. twitter' },
];

const BADGE_FIELDS: RepeaterField[] = [
  { name: 'name', label: 'Name' },
  { name: 'description', label: 'Description' },
  { name: 'link', label: 'URL' },
];

@customElement('admin-form')
export class AdminForm extends LitElement {
  @property({ type: Object }) schema!: CollectionSchema;
  @property({ type: String }) editId = '';
  @property({ type: String }) collectionPath = '';

  @state() private data: Record<string, unknown> = {};
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private docId = '';
  @state() private speakerOptions: { value: string; label: string }[] = [];
  @state() private existingIds: string[] = [];

  static override styles = css`
    :host {
      display: block;
      max-width: 700px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 24px;
      margin: 0;
    }

    .field {
      margin-bottom: 16px;
    }

    .id-field {
      margin-bottom: 16px;
    }

    .id-field label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--sl-color-neutral-700);
    }

    .id-preview {
      font-size: 12px;
      color: var(--sl-color-neutral-500);
      margin-top: 4px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private get effectivePath(): string {
    return this.collectionPath || this.schema.collectionPath;
  }

  private get isEditing(): boolean {
    return this.editId !== '';
  }

  private async loadData() {
    this.loading = true;

    // Load speaker options for sessions that reference speakers
    if (this.schema.fields.some((f) => f.name === 'speakers' && f.type === 'multiselect')) {
      try {
        const speakers = await fetchCollection('speakers', 'name');
        this.speakerOptions = speakers.map((s) => ({
          value: s.id,
          label: (s['name'] as string) || s.id,
        }));
      } catch {
        this.speakerOptions = [];
      }
    }

    // Load existing IDs for padded ID generation
    try {
      const existing = await fetchCollection(this.effectivePath, this.schema.orderField);
      this.existingIds = existing.map((d) => d.id);
    } catch {
      this.existingIds = [];
    }

    if (this.isEditing) {
      const doc = await fetchDocument(this.effectivePath, this.editId);
      if (doc) {
        this.data = doc;
        this.docId = doc.id;
      }
    } else {
      // Set defaults
      this.data = {};
      this.schema.fields.forEach((f) => {
        if (f.type === 'boolean') this.data[f.name] = false;
        if (f.type === 'number') this.data[f.name] = 0;
        if (f.type === 'socials' || f.type === 'badges') this.data[f.name] = [];
        if (f.type === 'multiselect') this.data[f.name] = [];
      });

      if (this.schema.idStrategy === 'padded') {
        this.docId = nextPaddedId(this.existingIds);
      }
    }

    this.loading = false;
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    return html`
      <div class="header">
        <sl-button variant="text" @click=${this.handleBack}>
          <sl-icon name="arrow-left"></sl-icon>
        </sl-button>
        <h1>${this.isEditing ? 'Edit' : 'New'} ${this.schema.displayName}</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert
              variant="${this.message.type}"
              open
              closable
              @sl-after-hide=${() => (this.message = null)}
            >
              ${this.message.text}
            </sl-alert>
          `
        : nothing}
      ${this.renderIdField()} ${this.schema.fields.map((field) => this.renderField(field))}

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isEditing ? 'Save Changes' : 'Create'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private renderIdField() {
    if (this.isEditing) {
      return html`
        <div class="id-field">
          <label>Document ID</label>
          <sl-input value="${this.docId}" disabled></sl-input>
        </div>
      `;
    }

    switch (this.schema.idStrategy) {
      case 'slug':
        return html`
          <div class="id-field">
            <label>Document ID (auto-generated from ${this.schema.slugField})</label>
            <sl-input value="${this.docId || '(will be generated)'}" disabled></sl-input>
          </div>
        `;
      case 'padded':
        return html`
          <div class="id-field">
            <label>Document ID (auto-generated)</label>
            <sl-input value="${this.docId}" disabled></sl-input>
          </div>
        `;
      case 'input':
        return html`
          <div class="id-field">
            <label>Document ID</label>
            <sl-input
              value="${this.docId}"
              required
              placeholder="Enter a unique document ID"
              @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;
      case 'date':
        return html`
          <div class="id-field">
            <label>Document ID (date)</label>
            <sl-input
              type="date"
              value="${this.docId}"
              required
              @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;
      default:
        return nothing;
    }
  }

  private renderField(field: FieldSchema) {
    const value = this.data[field.name];

    switch (field.type) {
      case 'string':
      case 'date':
      case 'time':
        return html`
          <div class="field">
            <sl-input
              label="${field.label}"
              type="${field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              placeholder="${field.placeholder || ''}"
              @sl-change=${(e: Event) =>
                this.setField(field.name, (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;

      case 'number':
        return html`
          <div class="field">
            <sl-input
              label="${field.label}"
              type="number"
              value="${value ?? ''}"
              ?required=${field.required}
              @sl-change=${(e: Event) =>
                this.setField(field.name, Number((e.target as HTMLInputElement).value))}
            ></sl-input>
          </div>
        `;

      case 'boolean':
        return html`
          <div class="field">
            <sl-switch
              ?checked=${!!value}
              @sl-change=${(e: Event) =>
                this.setField(field.name, (e.target as HTMLInputElement).checked)}
              >${field.label}</sl-switch
            >
          </div>
        `;

      case 'textarea':
        return html`
          <div class="field">
            <sl-textarea
              label="${field.label}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              rows="4"
              @sl-change=${(e: Event) =>
                this.setField(field.name, (e.target as HTMLInputElement).value)}
            ></sl-textarea>
          </div>
        `;

      case 'image':
        return html`
          <div class="field">
            <admin-image-upload
              label="${field.label}"
              value="${(value as string) || ''}"
              collection="${field.uploadCollection || ''}"
              @image-uploaded=${(e: CustomEvent) => this.setField(field.name, e.detail.url)}
            ></admin-image-upload>
          </div>
        `;

      case 'select':
        return html`
          <div class="field">
            <sl-select
              label="${field.label}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              @sl-change=${(e: Event) =>
                this.setField(field.name, (e.target as HTMLSelectElement).value)}
            >
              <sl-option value="">-- Select --</sl-option>
              ${(field.options || []).map(
                (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
              )}
            </sl-select>
          </div>
        `;

      case 'multiselect':
        return html`
          <div class="field">
            <sl-select
              label="${field.label}"
              multiple
              clearable
              .value=${(value as string[]) || []}
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as any).value)}
            >
              ${field.name === 'speakers'
                ? this.speakerOptions.map(
                    (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
                  )
                : (field.options || []).map(
                    (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
                  )}
            </sl-select>
          </div>
        `;

      case 'socials':
        return html`
          <div class="field">
            <admin-repeater
              label="${field.label}"
              .fields=${SOCIAL_FIELDS}
              .value=${(value as Record<string, string>[]) || []}
              @value-changed=${(e: CustomEvent) => this.setField(field.name, e.detail.value)}
            ></admin-repeater>
          </div>
        `;

      case 'badges':
        return html`
          <div class="field">
            <admin-repeater
              label="${field.label}"
              .fields=${BADGE_FIELDS}
              .value=${(value as Record<string, string>[]) || []}
              @value-changed=${(e: CustomEvent) => this.setField(field.name, e.detail.value)}
            ></admin-repeater>
          </div>
        `;

      default:
        return nothing;
    }
  }

  private setField(name: string, value: unknown) {
    this.data = { ...this.data, [name]: value };

    // Auto-generate slug for ID
    if (!this.isEditing && this.schema.idStrategy === 'slug' && name === this.schema.slugField) {
      this.docId = toSlug(value as string);
    }
  }

  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Document ID is required.' };
      return;
    }

    this.saving = true;
    try {
      await saveDocument(this.effectivePath, this.docId, this.data);
      this.message = { type: 'success', text: 'Saved successfully!' };
      if (!this.isEditing) {
        // After creating, switch to edit mode
        this.editId = this.docId;
      }
    } catch (error) {
      this.message = { type: 'danger', text: `Save failed: ${error}` };
    }
    this.saving = false;
  }

  private handleBack() {
    this.dispatchEvent(
      new CustomEvent('admin-action', {
        detail: { action: 'back' },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/admin-form.ts
git commit -m "feat(admin): add generic form component with all field types"
```

---

### Task 9: Schedule Editor Component

**Files:**

- Create: `src/pages/admin/collections/schedule-form.ts`

**Step 1: Create the schedule form**

This is a custom form specifically for the schedule (days → tracks + timeslots), since the nested structure doesn't fit the generic form renderer.

Create `src/pages/admin/collections/schedule-form.ts`:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchDocument, saveDocument, fetchCollection, DocWithId } from '../admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

interface Track {
  title: string;
}

interface TimeslotSession {
  items: string[];
  extend?: number;
}

interface Timeslot {
  startTime: string;
  endTime: string;
  sessions: TimeslotSession[];
}

interface ScheduleDay {
  date: string;
  dateReadable: string;
  tracks: Track[];
  timeslots: Timeslot[];
}

@customElement('schedule-form')
export class ScheduleForm extends LitElement {
  @property({ type: String }) editId = '';

  @state() private day: ScheduleDay = {
    date: '',
    dateReadable: '',
    tracks: [{ title: '' }],
    timeslots: [],
  };
  @state() private sessions: DocWithId[] = [];
  @state() private assignedSessionIds: Set<string> = new Set();
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private isNew = false;
  @state() private docId = '';

  static override styles = css`
    :host {
      display: block;
      max-width: 900px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    h1,
    h2 {
      margin: 0;
    }

    h1 {
      font-size: 24px;
    }
    h2 {
      font-size: 18px;
      margin: 24px 0 12px;
    }

    .day-fields {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .day-fields sl-input {
      flex: 1;
    }

    .track-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .track-row sl-input {
      flex: 1;
    }

    .timeslot-card {
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--sl-color-neutral-200);
      border-radius: 8px;
    }

    .timeslot-header {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .timeslot-header sl-input {
      width: 140px;
    }

    .track-session {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .track-session sl-select {
      flex: 1;
    }

    .track-session sl-input {
      width: 100px;
    }

    .track-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--sl-color-neutral-500);
      margin-bottom: 4px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;

    // Load all sessions for the dropdowns
    try {
      this.sessions = await fetchCollection('sessions', 'title');
    } catch {
      this.sessions = [];
    }

    if (this.editId) {
      const doc = await fetchDocument('schedule', this.editId);
      if (doc) {
        this.day = doc as unknown as ScheduleDay;
        this.docId = this.editId;
      }
    } else {
      this.isNew = true;
    }

    this.updateAssignedSessions();
    this.loading = false;
  }

  private updateAssignedSessions() {
    const ids = new Set<string>();
    this.day.timeslots.forEach((ts) => {
      ts.sessions.forEach((s) => {
        s.items.forEach((id) => {
          if (id) ids.add(id);
        });
      });
    });
    this.assignedSessionIds = ids;
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    return html`
      <div class="header">
        <sl-button variant="text" @click=${this.handleBack}>
          <sl-icon name="arrow-left"></sl-icon>
        </sl-button>
        <h1>${this.isNew ? 'New' : 'Edit'} Schedule Day</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert
              variant="${this.message.type}"
              open
              closable
              @sl-after-hide=${() => (this.message = null)}
            >
              ${this.message.text}
            </sl-alert>
          `
        : nothing}

      <!-- Day Info -->
      <h2>Day Info</h2>
      <div class="day-fields">
        <sl-input
          label="Date (Document ID)"
          type="date"
          value="${this.docId || this.day.date}"
          ?disabled=${!this.isNew}
          @sl-change=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            this.docId = val;
            this.day = { ...this.day, date: val };
          }}
        ></sl-input>
        <sl-input
          label="Readable Date"
          value="${this.day.dateReadable}"
          placeholder="e.g. July 17"
          @sl-change=${(e: Event) =>
            (this.day = { ...this.day, dateReadable: (e.target as HTMLInputElement).value })}
        ></sl-input>
      </div>

      <!-- Tracks -->
      <h2>Tracks</h2>
      ${this.day.tracks.map(
        (track, i) => html`
          <div class="track-row">
            <sl-input
              value="${track.title}"
              placeholder="Track name (e.g. Main Stage)"
              @sl-change=${(e: Event) => this.updateTrack(i, (e.target as HTMLInputElement).value)}
            ></sl-input>
            ${this.day.tracks.length > 1
              ? html`<sl-icon-button
                  name="x-lg"
                  @click=${() => this.removeTrack(i)}
                ></sl-icon-button>`
              : nothing}
          </div>
        `,
      )}
      <sl-button size="small" @click=${this.addTrack}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Track
      </sl-button>

      <!-- Timeslots -->
      <h2>Timeslots</h2>
      ${this.day.timeslots.map((ts, tsIndex) => this.renderTimeslot(ts, tsIndex))}
      <sl-button size="small" @click=${this.addTimeslot}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Timeslot
      </sl-button>

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isNew ? 'Create' : 'Save Changes'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private renderTimeslot(ts: Timeslot, tsIndex: number) {
    return html`
      <div class="timeslot-card">
        <div class="timeslot-header">
          <sl-input
            label="Start Time"
            type="time"
            value="${ts.startTime}"
            @sl-change=${(e: Event) =>
              this.updateTimeslotTime(tsIndex, 'startTime', (e.target as HTMLInputElement).value)}
          ></sl-input>
          <sl-input
            label="End Time"
            type="time"
            value="${ts.endTime}"
            @sl-change=${(e: Event) =>
              this.updateTimeslotTime(tsIndex, 'endTime', (e.target as HTMLInputElement).value)}
          ></sl-input>
          <sl-icon-button
            name="trash"
            label="Remove timeslot"
            style="color: var(--sl-color-danger-600);"
            @click=${() => this.removeTimeslot(tsIndex)}
          ></sl-icon-button>
        </div>

        ${this.day.tracks.map((track, trackIndex) => {
          const session = ts.sessions[trackIndex] || { items: [''], extend: undefined };
          const sessionId = session.items[0] || '';
          return html`
            <div class="track-label">${track.title || `Track ${trackIndex + 1}`}</div>
            <div class="track-session">
              <sl-select
                placeholder="Select session..."
                value="${sessionId}"
                clearable
                hoist
                @sl-change=${(e: Event) =>
                  this.updateTimeslotSession(tsIndex, trackIndex, (e.target as any).value)}
              >
                ${this.sessions.map(
                  (s) => html`
                    <sl-option value="${s.id}">
                      ${s['title']}
                      ${this.assignedSessionIds.has(s.id) && s.id !== sessionId
                        ? ' (assigned)'
                        : ''}
                    </sl-option>
                  `,
                )}
              </sl-select>
              <sl-input
                type="number"
                label="Extend"
                value="${session.extend ?? ''}"
                placeholder="1"
                @sl-change=${(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateTimeslotExtend(tsIndex, trackIndex, val ? Number(val) : undefined);
                }}
              ></sl-input>
            </div>
          `;
        })}
      </div>
    `;
  }

  // --- Track operations ---
  private updateTrack(index: number, title: string) {
    const tracks = [...this.day.tracks];
    tracks[index] = { title };
    this.day = { ...this.day, tracks };
  }

  private addTrack() {
    this.day = { ...this.day, tracks: [...this.day.tracks, { title: '' }] };
    // Add a session slot to each existing timeslot for the new track
    const timeslots = this.day.timeslots.map((ts) => ({
      ...ts,
      sessions: [...ts.sessions, { items: [''] }],
    }));
    this.day = { ...this.day, timeslots };
  }

  private removeTrack(index: number) {
    const tracks = this.day.tracks.filter((_, i) => i !== index);
    const timeslots = this.day.timeslots.map((ts) => ({
      ...ts,
      sessions: ts.sessions.filter((_, i) => i !== index),
    }));
    this.day = { ...this.day, tracks, timeslots };
  }

  // --- Timeslot operations ---
  private addTimeslot() {
    const sessions = this.day.tracks.map(() => ({ items: [''] }));
    this.day = {
      ...this.day,
      timeslots: [...this.day.timeslots, { startTime: '', endTime: '', sessions }],
    };
  }

  private removeTimeslot(index: number) {
    this.day = {
      ...this.day,
      timeslots: this.day.timeslots.filter((_, i) => i !== index),
    };
    this.updateAssignedSessions();
  }

  private updateTimeslotTime(tsIndex: number, field: 'startTime' | 'endTime', value: string) {
    const timeslots = [...this.day.timeslots];
    timeslots[tsIndex] = { ...timeslots[tsIndex], [field]: value };
    this.day = { ...this.day, timeslots };
  }

  private updateTimeslotSession(tsIndex: number, trackIndex: number, sessionId: string) {
    const timeslots = [...this.day.timeslots];
    const sessions = [...timeslots[tsIndex].sessions];
    sessions[trackIndex] = { ...sessions[trackIndex], items: sessionId ? [sessionId] : [''] };
    timeslots[tsIndex] = { ...timeslots[tsIndex], sessions };
    this.day = { ...this.day, timeslots };
    this.updateAssignedSessions();
  }

  private updateTimeslotExtend(tsIndex: number, trackIndex: number, extend: number | undefined) {
    const timeslots = [...this.day.timeslots];
    const sessions = [...timeslots[tsIndex].sessions];
    sessions[trackIndex] = { ...sessions[trackIndex], extend };
    timeslots[tsIndex] = { ...timeslots[tsIndex], sessions };
    this.day = { ...this.day, timeslots };
  }

  // --- Save ---
  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Date is required.' };
      return;
    }

    // Sort timeslots by start time before saving
    const sortedTimeslots = [...this.day.timeslots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    // Clean up sessions: remove empty items, remove undefined extend
    const cleanTimeslots = sortedTimeslots.map((ts) => ({
      ...ts,
      sessions: ts.sessions.map((s) => {
        const clean: TimeslotSession = { items: s.items.filter((id) => id !== '') };
        if (s.extend && s.extend > 1) clean.extend = s.extend;
        return clean;
      }),
    }));

    this.saving = true;
    try {
      await saveDocument('schedule', this.docId, {
        date: this.day.date || this.docId,
        dateReadable: this.day.dateReadable,
        tracks: this.day.tracks,
        timeslots: cleanTimeslots,
      });
      this.message = { type: 'success', text: 'Schedule day saved!' };
      if (this.isNew) {
        this.isNew = false;
        this.editId = this.docId;
      }
    } catch (error) {
      this.message = { type: 'danger', text: `Save failed: ${error}` };
    }
    this.saving = false;
  }

  private handleBack() {
    this.dispatchEvent(
      new CustomEvent('admin-action', {
        detail: { action: 'back' },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/collections/schedule-form.ts
git commit -m "feat(admin): add schedule day editor with tracks and timeslots"
```

---

### Task 10: Config Editor Component

**Files:**

- Create: `src/pages/admin/collections/config-form.ts`

**Step 1: Create the config form**

Config documents have varied structures, so this uses a dynamic JSON-ish key-value editor.

Create `src/pages/admin/collections/config-form.ts`:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchDocument, saveDocument } from '../admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

@customElement('config-form')
export class ConfigForm extends LitElement {
  @property({ type: String }) editId = '';

  @state() private jsonText = '';
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private isNew = false;
  @state() private docId = '';

  static override styles = css`
    :host {
      display: block;
      max-width: 700px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 24px;
      margin: 0;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .id-field {
      margin-bottom: 16px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    if (this.editId) {
      const doc = await fetchDocument('config', this.editId);
      if (doc) {
        const { id, ...data } = doc;
        this.jsonText = JSON.stringify(data, null, 2);
        this.docId = this.editId;
      }
    } else {
      this.isNew = true;
      this.jsonText = '{\n  \n}';
    }
    this.loading = false;
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    return html`
      <div class="header">
        <sl-button variant="text" @click=${this.handleBack}>
          <sl-icon name="arrow-left"></sl-icon>
        </sl-button>
        <h1>${this.isNew ? 'New' : 'Edit'} Config: ${this.docId || ''}</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert
              variant="${this.message.type}"
              open
              closable
              @sl-after-hide=${() => (this.message = null)}
            >
              ${this.message.text}
            </sl-alert>
          `
        : nothing}
      ${this.isNew
        ? html`
            <div class="id-field">
              <sl-input
                label="Config Key"
                value="${this.docId}"
                placeholder="e.g. schedule, notifications, mailchimp"
                @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
              ></sl-input>
            </div>
          `
        : nothing}

      <sl-textarea
        label="Config JSON"
        value="${this.jsonText}"
        rows="15"
        style="font-family: monospace;"
        @sl-change=${(e: Event) => (this.jsonText = (e.target as HTMLTextAreaElement).value)}
      ></sl-textarea>

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isNew ? 'Create' : 'Save Changes'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Config key is required.' };
      return;
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(this.jsonText);
    } catch {
      this.message = { type: 'danger', text: 'Invalid JSON.' };
      return;
    }

    this.saving = true;
    try {
      await saveDocument('config', this.docId, data);
      this.message = { type: 'success', text: 'Config saved!' };
      this.isNew = false;
    } catch (error) {
      this.message = { type: 'danger', text: `Save failed: ${error}` };
    }
    this.saving = false;
  }

  private handleBack() {
    this.dispatchEvent(
      new CustomEvent('admin-action', {
        detail: { action: 'back' },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/collections/config-form.ts
git commit -m "feat(admin): add config JSON editor"
```

---

### Task 11: Wire Admin Page to List/Form Components with Routing

**Files:**

- Modify: `src/pages/admin/admin-page.ts`

**Step 1: Update admin-page.ts to handle section routing and render list/form views**

Update `admin-page.ts` to import and switch between the list, form, schedule-form, and config-form components based on the current navigation state. Track the current view (list, edit, new) and current section. Listen for `admin-action` events to navigate between views.

The render method's main slot area should switch like this:

```typescript
// In the render method, replace <slot></slot> with:
${this.renderContent()}

// Add renderContent method:
private renderContent() {
  // Schedule uses its own custom form
  if (this.currentSection === 'schedule') {
    if (this.currentView === 'list') {
      return html`<admin-list
        .schema=${SCHEMAS['schedule'] /* add schedule to schemas with orderField: 'date' */}
        @admin-action=${this.handleAction}
      ></admin-list>`;
    }
    return html`<schedule-form
      editId="${this.currentEditId}"
      @admin-action=${this.handleAction}
    ></schedule-form>`;
  }

  // Config uses its own custom form
  if (this.currentSection === 'config') {
    if (this.currentView === 'list') {
      return html`<admin-list .schema=${SCHEMAS.config} @admin-action=${this.handleAction}></admin-list>`;
    }
    return html`<config-form
      editId="${this.currentEditId}"
      @admin-action=${this.handleAction}
    ></config-form>`;
  }

  // Partners and team have subcollection navigation
  if (this.currentSection === 'partners') {
    return this.renderSubcollectionSection('partner-groups', 'partner-items', 'items');
  }
  if (this.currentSection === 'team') {
    return this.renderSubcollectionSection('team-groups', 'team-members', 'members');
  }

  // All other collections use generic list + form
  const schemaKey = this.sectionToSchemaKey(this.currentSection);
  const schema = SCHEMAS[schemaKey];
  if (!schema) return html`<p>Unknown section.</p>`;

  if (this.currentView === 'list') {
    return html`<admin-list .schema=${schema} @admin-action=${this.handleAction}></admin-list>`;
  }
  return html`<admin-form
    .schema=${schema}
    editId="${this.currentEditId}"
    @admin-action=${this.handleAction}
  ></admin-form>`;
}
```

Add a `schedule` entry to the SCHEMAS object in `schemas/index.ts`:

```typescript
schedule: {
  collectionPath: 'schedule',
  displayName: 'Schedule Days',
  orderField: 'date',
  listFields: ['date', 'dateReadable'],
  idStrategy: 'date',
  fields: [],
},
```

Add the necessary state properties, imports, and event handlers. Wire up `handleAction` to switch between `list`/`edit`/`new` views. The subcollection renderer (`renderSubcollectionSection`) should track parent selection and show either the group list, group form, items list, or item form.

**Step 2: Test navigation**

Run: `npm start`
Navigate through `/admin/speakers`, `/admin/sessions`, etc. Verify list loads data and edit/new navigation works.

**Step 3: Commit**

```bash
git add src/pages/admin/admin-page.ts src/pages/admin/schemas/index.ts
git commit -m "feat(admin): wire up section routing with list/form views"
```

---

### Task 12: Add Sessions Tags as Dynamic Multiselect

**Files:**

- Modify: `src/pages/admin/admin-form.ts`

**Step 1: Add tag gathering for sessions**

The sessions form has a `tags` multiselect, but tags aren't predefined — they come from existing session data. Update `admin-form.ts`'s `loadData` method to also gather existing tags:

```typescript
// In loadData(), after loading speakers:
if (this.schema.fields.some((f) => f.name === 'tags' && f.type === 'multiselect')) {
  try {
    const allSessions = await fetchCollection('sessions', 'title');
    const tagSet = new Set<string>();
    allSessions.forEach((s) => {
      const tags = s['tags'] as string[] | undefined;
      if (tags) tags.forEach((t) => tagSet.add(t));
    });
    this.tagOptions = Array.from(tagSet)
      .sort()
      .map((t) => ({ value: t, label: t }));
  } catch {
    this.tagOptions = [];
  }
}
```

Add `@state() private tagOptions` and update the `multiselect` render case to use `tagOptions` when `field.name === 'tags'`.

Also make the tags multiselect allow free-form entry so new tags can be added.

**Step 2: Commit**

```bash
git add src/pages/admin/admin-form.ts
git commit -m "feat(admin): add dynamic tag options for sessions multiselect"
```

---

### Task 13: Previous Speakers Session Editor

**Files:**

- Create: `src/pages/admin/collections/previous-speakers-form.ts`

**Step 1: Create the previous speakers form**

Previous speakers have a nested `sessions` field keyed by year (`{ [year: string]: PreviousSession[] }`). This needs a custom form that extends the generic one with a sessions-by-year section.

Create `src/pages/admin/collections/previous-speakers-form.ts` — a Lit component that:

- Renders the standard fields from the `previous-speakers` schema using the generic admin-form patterns (reuse the field rendering logic or compose with admin-form)
- Adds a "Sessions by Year" section below the standard fields
- Each year is a group with a year input + repeatable session rows (title, tags, presentation URL, videoId)
- "Add Year" button adds a new year group
- "Add Session" button within each year adds a session row

**Step 2: Commit**

```bash
git add src/pages/admin/collections/previous-speakers-form.ts
git commit -m "feat(admin): add previous speakers form with sessions-by-year editor"
```

---

### Task 14: Shoelace Theme CSS Import

**Files:**

- Modify: `src/pages/admin/admin-page.ts`

**Step 1: Import Shoelace theme styles**

Shoelace requires its theme CSS to be loaded. Since this is a web component, the theme needs to be applied at the document level. Add to `admin-page.ts`:

```typescript
// At module level, ensure the light theme stylesheet is added to the document
const SHOELACE_THEME_URL =
  'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css';

if (!document.querySelector(`link[href="${SHOELACE_THEME_URL}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SHOELACE_THEME_URL;
  document.head.appendChild(link);
}
```

This ensures the Shoelace design tokens are available. Only loaded once when the admin page is first accessed, and doesn't affect the rest of the site since Shoelace tokens use namespaced CSS custom properties (`--sl-*`).

**Step 2: Commit**

```bash
git add src/pages/admin/admin-page.ts
git commit -m "feat(admin): add Shoelace theme CSS injection"
```

---

### Task 15: Firestore Security Rules for Admin

**Files:**

- Modify: `firestore.rules`

**Step 1: Read the current Firestore rules**

Check the current `firestore.rules` to understand the existing access patterns.

**Step 2: Add admin write rules**

Add rules allowing authenticated `@majorleaguehacking.com` users to write to all collections the admin panel manages. The existing read rules should stay as-is.

Add a helper function:

```
function isMLHAdmin() {
  return request.auth != null && request.auth.token.email.matches('.*@majorleaguehacking[.]com$');
}
```

Then for each managed collection (speakers, sessions, schedule, tickets, partners, team, previousSpeakers, videos, gallery, blog, config), add:

```
allow write: if isMLHAdmin();
```

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(admin): add Firestore write rules for MLH admin users"
```

---

### Task 16: End-to-End Smoke Test

**Step 1: Start the dev server**

Run: `npm start`

**Step 2: Test each section**

Navigate to `http://localhost:5000/admin` and verify:

1. Auth gate shows when not signed in
2. Sign in with MLH account grants access
3. Sidebar navigation works for all sections
4. Each collection list loads and shows data
5. Create a test speaker → verify it appears in the list
6. Edit the test speaker → verify changes save
7. Delete the test speaker → verify it's removed
8. Navigate to Schedule → create a test day with tracks and timeslots
9. Upload an image in a speaker form → verify it uploads and shows preview
10. Check that generated collections update after editing raw data (may take a few seconds for Cloud Functions to trigger)

**Step 3: Fix any issues found during testing**

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(admin): address issues found during smoke testing"
```

---

## Summary

| Task | Component                         | Estimated Complexity |
| ---- | --------------------------------- | -------------------- |
| 1    | Install Shoelace                  | Small                |
| 2    | Admin page shell + auth gate      | Medium               |
| 3    | Firestore CRUD utilities          | Medium               |
| 4    | Image upload component            | Medium               |
| 5    | Schema definitions                | Medium               |
| 6    | Generic list component            | Medium               |
| 7    | Repeater component                | Small                |
| 8    | Generic form component            | Large                |
| 9    | Schedule editor                   | Large                |
| 10   | Config editor                     | Small                |
| 11   | Wire routing in admin page        | Large                |
| 12   | Dynamic tags multiselect          | Small                |
| 13   | Previous speakers sessions editor | Medium               |
| 14   | Shoelace theme CSS                | Small                |
| 15   | Firestore security rules          | Small                |
| 16   | End-to-end smoke test             | Medium               |
