import { parse } from 'csv-parse/sync';

export interface CsvRow {
  title: string;
  description: string;
  stage: string;
  day: string;
  startTime: string;
  endTime: string;
  speakerName: string;
  speakerTitle: string;
  speakerHeadshotUrl: string;
  speakerCompany: string;
}

const REQUIRED_COLUMNS: Array<keyof CsvRow> = [
  'title',
  'description',
  'stage',
  'day',
  'startTime',
  'endTime',
  'speakerName',
  'speakerTitle',
  'speakerHeadshotUrl',
  'speakerCompany',
];

/** Optional flag column from the tracker sheet; non-TRUE rows are skipped. */
const READY_COLUMN = 'Ready for Website?';

const DRIVE_FILE_PATTERN = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/;

/** Normalize "9:00", "9:00:00", "11:30:00" → "09:00", "09:00", "11:30". */
function normalizeTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return time; // leave invalid values for schedule validation to reject
  return `${match[1]!.padStart(2, '0')}:${match[2]}`;
}

/**
 * Google Drive share links don't serve image bytes; convert file links to the
 * direct-download form (rehostable / usable as img src). Folder links can't
 * reference a single image, so blank them with a warning.
 */
function normalizeHeadshotUrl(url: string): string {
  const fileMatch = url.match(DRIVE_FILE_PATTERN);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }
  if (url.startsWith('https://drive.google.com/drive/')) {
    console.warn(`[warn] Drive folder link cannot be used as a headshot, blanking: ${url}`);
    return '';
  }
  return url;
}

export function parseCsv(input: string): CsvRow[] {
  const records = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  if (records.length === 0) return [];

  const firstRow = records[0]!;
  for (const col of REQUIRED_COLUMNS) {
    if (!(col in firstRow)) {
      throw new Error(`CSV is missing required column: ${col}`);
    }
  }

  const hasReadyColumn = READY_COLUMN in firstRow;
  const ready = hasReadyColumn
    ? records.filter((row) => (row[READY_COLUMN] ?? '').trim().toUpperCase() === 'TRUE')
    : records;
  if (hasReadyColumn && ready.length < records.length) {
    console.warn(
      `[warn] Skipping ${records.length - ready.length} row(s) not marked TRUE in "${READY_COLUMN}"`,
    );
  }

  return ready.map((row) => {
    const out: Partial<CsvRow> = {};
    for (const col of REQUIRED_COLUMNS) {
      out[col] = (row[col] ?? '').trim();
    }
    out.startTime = normalizeTime(out.startTime!);
    out.endTime = normalizeTime(out.endTime!);
    out.speakerHeadshotUrl = normalizeHeadshotUrl(out.speakerHeadshotUrl!);
    return out as CsvRow;
  });
}
