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
