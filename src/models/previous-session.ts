export interface PreviousSession {
  presentation?: string;
  sessionId?: string;
  tags: string[];
  title: string;
  videoId?: string;
}

export interface PreviousSessionWithYear extends PreviousSession {
  year: string;
}

/** Speaker metadata snapshot for a specific conference year. */
export interface YearSnapshot {
  bio: string;
  company: string;
  /** Speaker's job title for this year (not a talk title). */
  title: string;
  talks: PreviousSession[];
}
