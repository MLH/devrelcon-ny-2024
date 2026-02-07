import { Badge } from './badge';
import { Social } from './social';
import { Id } from './types';
import { YearSnapshot } from './previous-session';

export interface SpeakerData {
  active?: boolean;
  badges?: Badge[];
  bio: string;
  company: string;
  companyLogo: string;
  companyLogoUrl: string;
  country: string;
  featured: boolean;
  history?: { [year: string]: YearSnapshot };
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
