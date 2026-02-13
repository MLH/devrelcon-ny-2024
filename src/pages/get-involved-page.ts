import { customElement } from '@polymer/decorators';
import '@polymer/paper-button';
import { html, PolymerElement } from '@polymer/polymer';
import '../components/hero/simple-hero';
import '../elements/footer-block';
import { cfp, heroSettings, mailto, partnershipProposition } from '../utils/data';
import { updateMetadata } from '../utils/metadata';

/* eslint-disable max-len */

@customElement('get-involved-page')
export class GetInvolvedPage extends PolymerElement {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment">
        :host {
          display: block;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 16px 64px;
        }

        .intro {
          font-size: 18px;
          line-height: 1.6;
          color: var(--primary-text-color);
          margin-bottom: 48px;
        }

        .pathway {
          margin-bottom: 48px;
          padding: 32px;
          background-color: var(--secondary-background-color);
          border-radius: var(--border-radius);
        }

        .pathway-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin: 0 0 16px;
          line-height: 1.3;
        }

        .pathway p {
          font-size: 16px;
          line-height: 1.6;
          color: var(--primary-text-color);
          margin: 0 0 16px;
        }

        .pathway p:last-of-type {
          margin-bottom: 24px;
        }

        .pathway .formats {
          font-weight: 500;
        }

        .cfp-closed-note {
          font-size: 14px;
          line-height: 1.6;
          color: var(--secondary-text-color);
          margin-top: 8px;
          font-style: italic;
        }

        .cta-container {
          margin-top: 8px;
        }

        .cta-container a {
          text-decoration: none;
        }

        .cta-button {
          background-color: var(--default-primary-color);
          color: var(--text-primary-color);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 24px;
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: background-color var(--animation);
        }

        .cta-button:hover {
          background-color: var(--primary-color-light);
        }

        @media (min-width: 640px) {
          .container {
            padding: 48px 32px 80px;
          }
        }
      </style>

      <simple-hero page="getInvolved"></simple-hero>

      <div class="container">
        <p class="intro">
          DevRelCon is built by the community, for the community. There are many
          ways to be part of it — whether you want to share your expertise on
          stage, support the event as a partner, help out as a volunteer, or host
          a side event.
        </p>

        <!-- Pathway 1: Speak at DevRelCon -->
        <div class="pathway">
          <h2 class="pathway-title">Speak at DevRelCon</h2>
          <p>
            We're looking for practitioners with real-world experience in
            developer relations, developer experience, product marketing for
            developers, platform engineering, AI developer tooling, and
            go-to-market strategy.
          </p>
          <p>
            We value practical, experience-based talks over thought leadership.
            Tell us what you tried, what worked, what didn't, and what you
            learned. First-time speakers are welcome and encouraged.
          </p>
          <p class="formats">
            <strong>Formats:</strong> 25-minute talks, 10-minute lightning
            talks, 60-minute workshops, and panel discussions.
          </p>

          <template is="dom-if" if="[[isCfpOpen]]">
            <div class="cta-container">
              <a
                href="[[cfpFormUrl]]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <paper-button class="cta-button">
                  Submit a Talk Proposal
                </paper-button>
              </a>
            </div>
          </template>
          <template is="dom-if" if="[[!isCfpOpen]]">
            <p class="cfp-closed-note">
              The CFP for [[cfpYear]] is now closed. Sign up for our newsletter
              to be notified when the next CFP opens.
            </p>
          </template>
        </div>

        <!-- Pathway 2: Partner / Sponsor -->
        <div class="pathway">
          <h2 class="pathway-title">Partner / Sponsor</h2>
          <p>
            Put your brand in front of 300+ developer platform practitioners and
            leaders. Our partners get visibility, networking access, and the
            opportunity to connect with the people building developer adoption at
            the world's leading tech companies.
          </p>
          <p>
            Previous partners include Google, Common Room, Instruqt, Inkeep, Speakeasy, Brand Makers, Devpost, and more.
          </p>
          <div class="cta-container">
            <a
              href="[[partnerFormUrl]]"
              target="_blank"
              rel="noopener noreferrer"
            >
              <paper-button class="cta-button">
                Become a Partner
              </paper-button>
            </a>
          </div>
        </div>

        <!-- Pathway 3: Volunteer -->
        <div class="pathway">
          <h2 class="pathway-title">Volunteer</h2>
          <p>
            Help make DevRelCon happen. Volunteers help with registration, room
            management, AV support, and attendee experience. In exchange, you get
            free admission, a behind-the-scenes view of the event, and the
            gratitude of the community.
          </p>
          <div class="cta-container">
            <a href="mailto:[[volunteerEmail]]">
              <paper-button class="cta-button">
                Apply to Volunteer
              </paper-button>
            </a>
          </div>
        </div>

        <!-- Pathway 4: Host a Side Event -->
        <div class="pathway">
          <h2 class="pathway-title">Host a Side Event</h2>
          <p>
            Running a meetup, dinner, workshop, or happy hour around DevRelCon?
            We'd love to help promote it. Side events are a great way to extend
            the conference experience and connect with the community.
          </p>
          <div class="cta-container">
            <a href="mailto:[[sideEventEmail]]">
              <paper-button class="cta-button">
                Tell Us About Your Event
              </paper-button>
            </a>
          </div>
        </div>
      </div>

      <footer-block></footer-block>
    `;
  }

  private heroSettings = heroSettings.getInvolved;
  private isCfpOpen = cfp.status === 'open';
  private cfpFormUrl = cfp.formUrl;
  private cfpYear = cfp.year;
  private partnerFormUrl = partnershipProposition;
  private volunteerEmail = mailto;
  private sideEventEmail = mailto;

  override connectedCallback() {
    super.connectedCallback();
    updateMetadata(this.heroSettings.title, this.heroSettings.metaDescription);
  }
}
