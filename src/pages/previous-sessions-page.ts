import { Initialized, Pending, Success } from '@abraham/remotedata';
import { computed, customElement, property } from '@polymer/decorators';
import '@polymer/paper-progress';
import { html, PolymerElement } from '@polymer/polymer';
import '../components/hero/simple-hero';
import '../elements/shared-styles';
import { router } from '../router';
import { RootState, store } from '../store';
import { ReduxMixin } from '../store/mixin';
import { fetchSpeakers } from '../store/speakers/actions';
import { initialSpeakersState } from '../store/speakers/state';
import { heroSettings } from '../utils/data';
import { updateMetadata } from '../utils/metadata';
import { groupPreviousSessions } from '../utils/previous-sessions';

@customElement('previous-sessions-page')
export class PreviousSessionsPage extends ReduxMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment">
        :host {
          display: block;
          height: 100%;
        }

        paper-progress {
          width: 100%;
          --paper-progress-active-color: var(--default-primary-color);
          --paper-progress-secondary-color: var(--default-primary-color);
        }

        .year {
          margin: 32px 0 8px;
          font-size: 24px;
        }

        .session {
          display: block;
          padding: 12px 0;
          color: var(--primary-text-color);
          border-bottom: 1px solid var(--border-light-color);
        }

        .session:hover .title {
          color: var(--default-primary-color);
        }

        .title {
          line-height: 1.3;
        }

        .speakers {
          margin-top: 4px;
          font-size: 14px;
          color: var(--secondary-text-color);
        }
      </style>

      <simple-hero page="previousSessions"></simple-hero>

      <paper-progress indeterminate hidden$="[[!pending]]"></paper-progress>

      <div class="container">
        <template is="dom-repeat" items="[[years]]" as="yearData">
          <h2 class="year">[[yearData.year]]</h2>
          <template is="dom-repeat" items="[[yearData.sessions]]" as="session">
            <a class="session" href$="[[sessionUrl(session.id)]]">
              <div class="title">[[session.title]]</div>
              <div class="speakers">[[joinNames(session.speakers)]]</div>
            </a>
          </template>
        </template>
      </div>

      <footer-block></footer-block>
    `;
  }

  private heroSettings = heroSettings.previousSessions;

  @property({ type: Object })
  speakers = initialSpeakersState;

  override connectedCallback() {
    super.connectedCallback();
    updateMetadata(this.heroSettings.title, this.heroSettings.metaDescription);

    if (this.speakers instanceof Initialized) {
      store.dispatch(fetchSpeakers);
    }
  }

  override stateChanged(state: RootState) {
    this.speakers = state.speakers;
  }

  @computed('speakers')
  get pending() {
    return this.speakers instanceof Pending;
  }

  @computed('speakers')
  get years() {
    return this.speakers instanceof Success ? groupPreviousSessions(this.speakers.data) : [];
  }

  sessionUrl(id: string) {
    return router.urlForName('session-page', { id });
  }

  joinNames(names: string[]) {
    return names.join(', ');
  }
}
