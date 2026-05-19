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

  return records.map((row) => {
    const out: Partial<CsvRow> = {};
    for (const col of REQUIRED_COLUMNS) {
      out[col] = (row[col] ?? '').trim();
    }
    return out as CsvRow;
  });
}
