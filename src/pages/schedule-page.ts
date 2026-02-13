import { Initialized, Pending, Success } from '@abraham/remotedata';
import { computed, customElement, observe, property } from '@polymer/decorators';
import '@polymer/paper-progress';
import { html, PolymerElement } from '@polymer/polymer';
import { RouterLocation } from '@vaadin/router';
import '../components/hero/hero-block';
import '../elements/content-loader';
import '../elements/filter-menu';
import '../elements/header-bottom-toolbar';
import '../elements/shared-styles';
import '../elements/sticky-element';
import { Filter } from '../models/filter';
import { FilterGroup, FilterGroupKey } from '../models/filter-group';
import { RootState, store } from '../store';
import { selectFilters } from '../store/filters/selectors';
import { ReduxMixin } from '../store/mixin';
import { fetchSchedule } from '../store/schedule/actions';
import { initialScheduleState } from '../store/schedule/state';
import { fetchSessions } from '../store/sessions/actions';
import { selectFilterGroups } from '../store/sessions/selectors';
import { initialSessionsState, SessionsState } from '../store/sessions/state';
import { fetchSpeakers } from '../store/speakers/actions';
import { initialSpeakersState, SpeakersState } from '../store/speakers/state';
import { contentLoaders, heroSettings, scheduleTracks } from '../utils/data';
import { toggleFilter } from '../utils/filters';
import { updateMetadata } from '../utils/metadata';
import { generateClassName } from '../utils/styles';

@customElement('schedule-page')
export class SchedulePage extends ReduxMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment">
        :host {
          display: block;
          height: 100%;
        }

        .container {
          min-height: 80%;
        }

        paper-progress {
          width: 100%;
          --paper-progress-active-color: var(--default-primary-color);
          --paper-progress-secondary-color: var(--default-primary-color);
        }

        .track-legend {
          max-width: var(--max-container-width);
          margin: 0 auto;
          padding: 24px 16px;
        }

        .track-legend-title {
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--secondary-text-color);
          margin-bottom: 16px;
        }

        .track-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .track-card {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          border: 2px solid var(--border-light-color);
          border-radius: var(--border-radius);
          background-color: var(--primary-background-color);
          cursor: pointer;
          transition:
            border-color 0.2s,
            background-color 0.2s,
            box-shadow 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        .track-card:hover {
          background-color: var(--additional-background-color);
        }

        .track-card[active] {
          border-color: var(--track-color);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .track-color-indicator {
          width: 4px;
          min-height: 100%;
          border-radius: 2px;
          margin-right: 16px;
          flex-shrink: 0;
          align-self: stretch;
          background-color: var(--track-color);
        }

        .track-card-content {
          flex: 1;
          min-width: 0;
        }

        .track-card-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--primary-text-color);
        }

        .track-card-description {
          font-size: 13px;
          line-height: 1.4;
          color: var(--secondary-text-color);
          margin: 0;
        }

        .active-filters-bar {
          max-width: var(--max-container-width);
          margin: 0 auto;
          padding: 0 16px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .active-filters-bar[hidden] {
          display: none;
        }

        .clear-track-filter {
          font-size: 13px;
          color: var(--default-primary-color);
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .clear-track-filter:hover {
          text-decoration: underline;
        }

        .active-track-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          background-color: var(--track-color);
        }

        @media (max-width: 640px) {
          .container {
            padding: 0 0 32px;
          }

          .track-legend {
            padding: 16px;
          }
        }

        @media (min-width: 640px) {
          :host {
            background-color: #fff;
          }

          .track-legend {
            padding: 24px 36px;
          }

          .active-filters-bar {
            padding: 0 36px 16px;
          }
        }

        @media (min-width: 812px) {
          .track-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      </style>

      <hero-block
        background-image="[[heroSettings.background.image]]"
        background-color="[[heroSettings.background.color]]"
        font-color="[[heroSettings.fontColor]]"
      >
        <div class="hero-title">[[heroSettings.title]]</div>
        <p class="hero-description">[[heroSettings.description]]</p>
        <sticky-element slot="bottom">
          <header-bottom-toolbar location="[[location]]"></header-bottom-toolbar>
        </sticky-element>
      </hero-block>
<!--
      <div class="track-legend">
        <div class="track-legend-title">Filter by Track</div>
        <div class="track-cards">
          <template is="dom-repeat" items="[[trackList]]" as="track">
            <div
              class="track-card"
              style$="--track-color: [[track.color]]"
              active$="[[isTrackActive(selectedFilters, track.title)]]"
              on-click="onTrackClick"
            >
              <div class="track-color-indicator"></div>
              <div class="track-card-content">
                <div class="track-card-name">[[track.title]]</div>
                <p class="track-card-description">[[track.description]]</p>
              </div>
            </div>
          </template>
        </div>
      </div> 

      <div class="active-filters-bar" hidden$="[[!hasActiveTrackFilter]]">
        <template is="dom-repeat" items="[[activeTrackFilters]]" as="trackFilter">
          <span class="active-track-tag" style$="--track-color: [[getTrackColor(trackFilter.tag)]]">
            [[getTrackDisplayName(trackFilter.tag)]]
          </span>
        </template>
        <span class="clear-track-filter" role="button" on-click="clearTrackFilters">
          Clear track filter
        </span>
      </div> -->

      <paper-progress indeterminate hidden$="[[!pending]]"></paper-progress>

      <div class="container">
        <content-loader
          card-padding="15px"
          card-margin="16px 0"
          card-height="140px"
          avatar-size="0"
          avatar-circle="0"
          title-top-position="20px"
          title-height="42px"
          title-width="70%"
          load-from="-20%"
          load-to="80%"
          blur-width="300px"
          items-count="[[contentLoaders.itemsCount]]"
          hidden$="[[!pending]]"
          layout
        >
        </content-loader>

        <slot></slot>
      </div>

      <footer-block></footer-block>
    `;
  }

  private heroSettings = heroSettings.schedule;
  private contentLoaders = contentLoaders.schedule;

  @property({ type: Object })
  schedule = initialScheduleState;
  @property({ type: Object })
  sessions = initialSessionsState;
  @property({ type: Object })
  speakers = initialSpeakersState;

  @property({ type: Array })
  private filterGroups: FilterGroup[] = [];
  @property({ type: Array })
  private selectedFilters: Filter[] = [];
  @property({ type: Array })
  private activeTrackFilters: Filter[] = [];
  @property({ type: Boolean })
  private hasActiveTrackFilter = false;
  @property({ type: Object })
  private location: RouterLocation | undefined;
  @property({ type: Array })
  private trackList = Object.values(scheduleTracks);

  override connectedCallback() {
    super.connectedCallback();
    updateMetadata(this.heroSettings.title, this.heroSettings.metaDescription);

    if (this.sessions instanceof Initialized) {
      store.dispatch(fetchSessions);
    }

    if (this.speakers instanceof Initialized) {
      store.dispatch(fetchSpeakers);
    }
  }

  override stateChanged(state: RootState) {
    super.stateChanged(state);
    this.schedule = state.schedule;
    this.speakers = state.speakers;
    this.sessions = state.sessions;
    this.filterGroups = selectFilterGroups(state);
    this.selectedFilters = selectFilters(state);
  }

  onAfterEnter(location: RouterLocation) {
    this.location = location;
  }

  @observe('sessions', 'speakers')
  private onSessionsAndSpeakersChanged(sessions: SessionsState, speakers: SpeakersState) {
    if (
      this.schedule instanceof Initialized &&
      sessions instanceof Success &&
      speakers instanceof Success
    ) {
      store.dispatch(fetchSchedule);
    }
  }

  @computed('schedule')
  get pending() {
    return this.schedule instanceof Pending;
  }

  private isTrackActive(selectedFilters: Filter[], trackTitle: string): boolean {
    return selectedFilters.some(
      (f) =>
        f.group === FilterGroupKey.track &&
        generateClassName(f.tag) === generateClassName(trackTitle),
    );
  }

  @observe('selectedFilters')
  private onSelectedFiltersChanged(selectedFilters: Filter[]) {
    this.activeTrackFilters = selectedFilters.filter((f) => f.group === FilterGroupKey.track);
    this.hasActiveTrackFilter = this.activeTrackFilters.length > 0;
  }

  private onTrackClick(
    e: PointerEvent & { model: { track: { title: string; color: string; description: string } } },
  ) {
    const track = e.model.track;
    toggleFilter({
      group: FilterGroupKey.track,
      tag: generateClassName(track.title),
    });
  }

  private clearTrackFilters() {
    const trackFilters = this.selectedFilters.filter((f) => f.group === FilterGroupKey.track);
    for (const filter of trackFilters) {
      toggleFilter(filter);
    }
  }

  private getTrackColor(tag: string): string {
    for (const track of this.trackList) {
      if (generateClassName(track.title) === generateClassName(tag)) {
        return track.color;
      }
    }
    return 'var(--secondary-text-color)';
  }

  private getTrackDisplayName(tag: string): string {
    for (const track of this.trackList) {
      if (generateClassName(track.title) === generateClassName(tag)) {
        return track.title;
      }
    }
    return tag;
  }
}
