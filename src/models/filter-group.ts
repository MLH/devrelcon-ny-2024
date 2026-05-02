import { Filter } from './filter';

export enum FilterGroupKey {
  tags = 'tags',
  complexity = 'complexity',
  track = 'track',
}

export interface FilterGroup {
  title: string;
  key: FilterGroupKey;
  filters: Filter[];
}
