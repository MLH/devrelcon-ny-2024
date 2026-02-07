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
