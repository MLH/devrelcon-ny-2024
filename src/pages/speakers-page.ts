import { Initialized, Success } from '@abraham/remotedata';
import { computed, customElement, observe, property } from '@polymer/decorators';
import '@polymer/iron-icon';
import '@polymer/paper-icon-button';
import '@polymer/paper-progress';
import { html, PolymerElement } from '@polymer/polymer';
import '@power-elements/lazy-image';
import '../components/hero/simple-hero';
import '../components/text-truncate';
import '../elements/content-loader';
import '../elements/filter-menu';
import '../elements/shared-styles';
import { Filter } from '../models/filter';
import { FilterGroup, FilterGroupKey } from '../models/filter-group';
import { SpeakerWithTags } from '../models/speaker';
import { router } from '../router';
import { RootState, store } from '../store';
import { selectFilters } from '../store/filters/selectors';
import { ReduxMixin } from '../store/mixin';
import { selectFilterGroups } from '../store/sessions/selectors';
import { fetchSpeakers } from '../store/speakers/actions';
import { selectFilteredSpeakers, selectPastSpeakers } from '../store/speakers/selectors';
import { initialSpeakersState } from '../store/speakers/state';
import { contentLoaders, heroSettings, scheduleTracks } from '../utils/data';
import { toggleFilter } from '../utils/filters';
import '../utils/icons';
import { companyLogoUrl } from '../utils/logos';
import { updateMetadata } from '../utils/metadata';
import { generateClassName, getVariableColor } from '../utils/styles';

@customElement('speakers-page')
export class SpeakersPage extends ReduxMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment positioning">
        :host {
          display: block;
          height: 100%;
        }

        .container {
          display: grid;
          grid-template-columns: 1fr;
          grid-gap: 16px;
        }

        .speaker {
          padding: 32px 24px;
          background: var(--primary-background-color);
          text-align: center;
          transition: box-shadow var(--animation);
        }

        .speaker:hover {
          box-shadow: var(--box-shadow);
        }

        .photo {
          display: inline-block;
          --lazy-image-width: 128px;
          --lazy-image-height: 128px;
          --lazy-image-fit: cover;
          width: var(--lazy-image-width);
          height: var(--lazy-image-height);
          background-color: var(--secondary-background-color);
          border-radius: 50%;
          overflow: hidden;
          transform: translateZ(0);
        }

        .badges {
          position: absolute;
          top: 0;
          left: calc(50% + 32px);
        }

        .badge {
          margin-left: -10px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #fff;
          transition: transform var(--animation);
        }

        .badge:hover {
          transform: scale(1.1);
        }

        .badge:nth-of-type(2) {
          transform: translate(25%, 75%);
        }

        .badge:nth-of-type(2):hover {
          transform: translate3d(25%, 75%, 20px) scale(1.1);
        }

        .badge:nth-of-type(3) {
          transform: translate(10%, 180%);
        }

        .badge:nth-of-type(3):hover {
          transform: translate3d(10%, 180%, 20px) scale(1.1);
        }

        .badge-icon {
          --iron-icon-width: 12px;
          --iron-icon-height: 12px;
          color: #fff;
        }

        .company-logo {
          --lazy-image-width: 100%;
          --lazy-image-height: 16px;
          --lazy-image-fit: contain;
          width: var(--lazy-image-width);
          height: var(--lazy-image-height);
        }

        .description {
          color: var(--primary-text-color);
        }

        .name {
          margin-top: 8px;
          line-height: 1;
        }

        .origin {
          margin-top: 4px;
          font-size: 14px;
          line-height: 1.1;
        }

        .tag-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 4px;
          margin-top: 8px;
        }

        .tag-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.4;
          color: var(--tag-color);
          border: 1px solid var(--tag-color);
          background: transparent;
          text-transform: capitalize;
        }

        .bio {
          margin-top: 16px;
          color: var(--secondary-text-color);
        }

        .contacts {
          margin-top: 16px;
        }

        .social-icon {
          --paper-icon-button: {
            padding: 6px;
            width: 32px;
            height: 32px;
          }
          color: var(--secondary-text-color);
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

        @media (min-width: 640px) {
          .container {
            grid-template-columns: repeat(2, 1fr);
          }

          .track-legend {
            padding: 24px 36px;
          }

          .active-filters-bar {
            padding: 0 36px 16px;
          }
        }

        @media (min-width: 812px) {
          .container {
            grid-template-columns: repeat(3, 1fr);
          }

          .track-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .container {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      </style>

      <simple-hero page="speakers"></simple-hero>

      <paper-progress indeterminate hidden$="[[contentLoaderVisibility]]"></paper-progress>

      <div class="track-legend">
        <div class="track-legend-title">Filter by Track</div>
        <div class="track-cards">
          <template is="dom-repeat" items="[[trackList]]" as="track">
            <div
              class="track-card"
              style$="--track-color: [[track.color]]"
              active$="[[isTrackActive(selectedFilters, track.title)]]"
              on-click="onTrackClick"
              on-keydown="onTrackKeydown"
              role="button"
              tabindex="0"
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
        <span class="clear-track-filter" role="button" tabindex="0" on-click="clearTrackFilters" on-keydown="onClearKeydown">
          Clear track filter
        </span>
      </div>

      <filter-menu
        filter-groups="[[filterGroups]]"
        selected-filters="[[selectedFilters]]"
        results-count="[[speakersToRender.length]]"
      ></filter-menu>

      <content-loader
        class="container"
        card-padding="32px"
        card-height="400px"
        avatar-size="128px"
        avatar-circle="64px"
        horizontal-position="50%"
        border-radius="4px"
        box-shadow="var(--box-shadow)"
        items-count="[[contentLoaders.speakers.itemsCount]]"
        hidden$="[[contentLoaderVisibility]]"
      ></content-loader>

      <div class="container">
        <template is="dom-repeat" items="[[speakersToRender]]" as="speaker">
          <a class="speaker card" href$="[[speakerUrl(speaker.id)]]">
            <div relative>
              <lazy-image
                class="photo"
                src="[[speaker.photoUrl]]"
                alt="[[speaker.name]]"
              ></lazy-image>
              <div class="badges" layout horizontal>
                <template is="dom-repeat" items="[[speaker.badges]]" as="badge">
                  <a
                    class$="badge [[badge.name]]-b"
                    href$="[[badge.link]]"
                    target="_blank"
                    rel="noopener noreferrer"
                    title$="[[badge.description]]"
                    layout
                    horizontal
                    center-center
                  >
                    <iron-icon icon="hoverboard:[[badge.name]]" class="badge-icon"></iron-icon>
                  </a>
                </template>
              </div>
            </div>

            <lazy-image
              class="company-logo"
              src="[[_companyLogoUrl(speaker.company)]]"
              alt="[[speaker.company]]"
            ></lazy-image>

            <div class="description">
              <h2 class="name">[[speaker.name]]</h2>
              <div class="origin">[[speaker.country]]</div>

              <div class="tag-pills">
                <template is="dom-repeat" items="[[limitTags(speaker.tags)]]" as="tag">
                  <span
                    class="tag-pill"
                    style$="--tag-color: [[getTagColor(tag)]]"
                  >[[tag]]</span>
                </template>
              </div>

              <text-truncate lines="5">
                <short-markdown class="bio" content="[[speaker.bio]]"></short-markdown>
              </text-truncate>
            </div>

            <div class="contacts">
              <template is="dom-repeat" items="[[speaker.socials]]" as="social">
                <a href$="[[social.link]]" target="_blank" rel="noopener noreferrer">
                  <paper-icon-button
                    class="social-icon"
                    icon="hoverboard:{{social.icon}}"
                  ></paper-icon-button>
                </a>
              </template>
            </div>
          </a>
        </template>
      </div>

      <div class="container" hidden$="[[!pastSpeakers.length]]">
        <h1 class="container-title" style="grid-column: 1 / -1; text-align: center; margin-top: 32px;">Past Speakers</h1>
        <template is="dom-repeat" items="[[pastSpeakers]]" as="speaker">
          <a class="speaker card" href$="[[speakerUrl(speaker.id)]]">
            <div relative>
              <lazy-image
                class="photo"
                src="[[speaker.photoUrl]]"
                alt="[[speaker.name]]"
              ></lazy-image>
            </div>
            <div class="description">
              <h2 class="name">[[speaker.name]]</h2>
              <div class="origin">[[speaker.company]]</div>
            </div>
          </a>
        </template>
      </div>

      <footer-block></footer-block>
    `;
  }

  private heroSettings = heroSettings.speakers;
  private contentLoaders = contentLoaders;

  @property({ type: Object })
  speakers = initialSpeakersState;

  @property({ type: Array })
  private filterGroups: FilterGroup[] = [];
  @property({ type: Array })
  private selectedFilters: Filter[] = [];
  @property({ type: Array })
  private speakersToRender: SpeakerWithTags[] = [];
  @property({ type: Array })
  private pastSpeakers: SpeakerWithTags[] = [];
  @property({ type: Array })
  private activeTrackFilters: Filter[] = [];
  @property({ type: Boolean })
  private hasActiveTrackFilter = false;
  @property({ type: Array })
  private trackList = Object.values(scheduleTracks);

  override connectedCallback() {
    super.connectedCallback();
    updateMetadata(this.heroSettings.title, this.heroSettings.metaDescription);

    if (this.speakers instanceof Initialized) {
      store.dispatch(fetchSpeakers);
    }
  }

  override stateChanged(state: RootState) {
    super.stateChanged(state);
    this.speakers = state.speakers;
    this.filterGroups = selectFilterGroups(state, [FilterGroupKey.tags]);
    this.selectedFilters = selectFilters(state);
    this.speakersToRender = selectFilteredSpeakers(state);
    this.pastSpeakers = selectPastSpeakers(state);
  }

  @computed('speakers')
  get contentLoaderVisibility() {
    return this.speakers instanceof Success;
  }

  @observe('selectedFilters')
  private onSelectedFiltersChanged(selectedFilters: Filter[]) {
    this.activeTrackFilters = selectedFilters.filter((f) => f.group === FilterGroupKey.track);
    this.hasActiveTrackFilter = this.activeTrackFilters.length > 0;
  }

  private isTrackActive(selectedFilters: Filter[], trackTitle: string): boolean {
    return selectedFilters.some(
      (f) =>
        f.group === FilterGroupKey.track &&
        generateClassName(f.tag) === generateClassName(trackTitle),
    );
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

  private onTrackKeydown(
    e: KeyboardEvent & { model: { track: { title: string; color: string; description: string } } },
  ) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onTrackClick(e as unknown as PointerEvent & { model: { track: { title: string; color: string; description: string } } });
    }
  }

  private onClearKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.clearTrackFilters();
    }
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

  private limitTags(tags: string[]): string[] {
    return (tags || []).slice(0, 2);
  }

  private getTagColor(value: string): string {
    return getVariableColor(this, value, 'primary-text-color') || 'var(--primary-text-color)';
  }

  speakerUrl(id: string) {
    return router.urlForName('speaker-page', { id });
  }

  _companyLogoUrl(company: string) {
    return companyLogoUrl(company);
  }
}
