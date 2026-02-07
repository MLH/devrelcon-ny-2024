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

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
];

export const SCHEMAS: Record<string, CollectionSchema> = {
  speakers: {
    collectionPath: 'speakers',
    displayName: 'Speakers',
    orderField: 'order',
    listFields: ['name', 'company', 'order', 'featured', 'active'],
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
      { name: 'companyLogoUrl', label: 'Company Logo', type: 'image', uploadCollection: 'speakers' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'featured', label: 'Featured', type: 'boolean' },
      { name: 'active', label: 'Active (speaking this year)', type: 'boolean' },
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

  schedule: {
    collectionPath: 'schedule',
    displayName: 'Schedule Days',
    orderField: 'date',
    listFields: ['date', 'dateReadable'],
    idStrategy: 'date',
    fields: [],
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
      { name: 'currency', label: 'Currency Symbol', type: 'string', required: true, placeholder: '$' },
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
      { name: 'title', label: 'Group Title', type: 'string', required: true, placeholder: 'e.g. Gold Partners' },
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
      { name: 'title', label: 'Team Name', type: 'string', required: true, placeholder: 'e.g. Organizers' },
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
      { name: 'published', label: 'Publish Date', type: 'string', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'backgroundColor', label: 'Background Color', type: 'string', placeholder: '#ffffff' },
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
