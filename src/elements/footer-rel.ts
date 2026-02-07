import { customElement, property } from '@polymer/decorators';
import '@polymer/paper-icon-button';
import { html, PolymerElement } from '@polymer/polymer';
import {
  footerNewsletter,
  footerOrganizer,
  footerRelBlock,
  footer,
  followOur,
  followUs,
  emailUs,
  mailto,
  organizer,
  socialNetwork,
  subscribeBlock,
} from '../utils/data';
import '../utils/icons';
import './subscribe-form-footer';

@customElement('footer-rel')
export class FooterRel extends PolymerElement {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment">
        :host {
          border-top: 1px solid var(--border-light-color);
          border-bottom: 1px solid var(--border-light-color);
          margin: 0 20px 0 20px;
          overflow: auto;
          overflow-y: hidden;
          padding: 10px 0;
          color: var(--footer-text-color);
          display: grid;
          grid-gap: 24px;
          grid-template-columns: 1fr;
        }

        .col-heading {
          font-size: 14px;
          font-weight: 600;
          line-height: 21px;
          margin-top: 25px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        a {
          color: var(--footer-text-color);
          padding-bottom: 2px;
          text-decoration: none;
          pointer-events: all;
        }

        a:hover {
          text-decoration: underline;
        }

        li {
          display: list-item;
          line-height: 28px;
          pointer-events: none;
        }

        li:hover {
          text-decoration: underline;
        }

        /* Stay Connected column */
        .newsletter-subtitle {
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 12px;
          color: var(--footer-text-color);
          opacity: 0.85;
        }

        .social-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 12px;
        }

        .social-icons a {
          color: var(--footer-text-color);
        }

        .social-icons paper-icon-button {
          color: var(--footer-text-color);
          padding: 4px;
          width: 36px;
          height: 36px;
        }

        .blog-link {
          display: inline-block;
          margin-top: 8px;
          border-bottom: 1px solid var(--footer-text-color);
          padding-bottom: 1px;
          font-size: 13px;
        }

        .email-link {
          display: inline-block;
          margin-top: 4px;
          border-bottom: 1px solid var(--footer-text-color);
          padding-bottom: 1px;
          font-size: 13px;
        }

        /* Organizer column */
        .organizer-logo {
          display: block;
          margin-bottom: 12px;
        }

        .organizer-logo img {
          height: 24px;
          width: auto;
        }

        .brand-context {
          font-size: 13px;
          line-height: 1.4;
          margin-top: 12px;
          color: var(--footer-text-color);
          opacity: 0.85;
          font-style: italic;
        }

        .organizer-links {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .organizer-links li {
          line-height: 28px;
        }

        @media (min-width: 640px) {
          :host {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 768px) {
          :host {
            margin: 15px 0;
            padding: 30px 0;
          }

          .col-heading {
            font-size: 16px;
            margin-top: 0;
          }
        }

        @media (min-width: 960px) {
          :host {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }
      </style>

      <!-- Link columns from footerRelBlock data -->
      <template is="dom-repeat" items="[[footerRelBlock]]" as="footerRel">
        <div class="col" layout vertical wrap flex-auto>
          <div class="col-heading">[[footerRel.title]]</div>
          <ul class="nav">
            <template is="dom-repeat" items="[[footerRel.links]]" as="link">
              <li>
                <template is="dom-if" if="[[!link.newTab]]">
                  <a href="[[link.url]]">[[link.name]]</a>
                </template>
                <template is="dom-if" if="[[link.newTab]]">
                  <a href="[[link.url]]" target="_blank" rel="noopener noreferrer"
                    >[[link.name]]</a
                  >
                </template>
              </li>
            </template>
          </ul>
        </div>
      </template>

      <!-- Stay Connected column -->
      <div class="col" layout vertical wrap flex-auto>
        <div class="col-heading">[[footerNewsletter.title]]</div>
        <div class="newsletter-subtitle">[[footerNewsletter.subtitle]]</div>
        <subscribe-form-footer></subscribe-form-footer>
        <div class="social-icons">
          <template is="dom-repeat" items="[[socialNetwork.follow]]" as="socFollow">
            <a href="[[socFollow.url]]" target="_blank" rel="noopener noreferrer">
              <paper-icon-button icon="hoverboard:[[socFollow.name]]"></paper-icon-button>
            </a>
          </template>
        </div>
        <a
          class="blog-link"
          href="[[organizer.blog]]"
          target$="[[_computeBlogTarget(organizer.blog)]]"
          rel="noopener noreferrer"
        >
          [[followOur]] [[footer.blog]]
        </a>
        <a class="email-link" href="mailto:[[mailto]]">[[emailUs]]</a>
      </div>

      <!-- Organized By column -->
      <div class="col" layout vertical wrap flex-auto>
        <div class="col-heading">[[footerOrganizer.title]]</div>
        <ul class="organizer-links">
          <template is="dom-repeat" items="[[footerOrganizer.organizers]]" as="org">
            <li>
              <a href="[[org.url]]" target="_blank" rel="noopener noreferrer">[[org.name]]</a>
            </li>
          </template>
        </ul>
        <div class="brand-context">[[footerOrganizer.brandContext]]</div>
      </div>
    `;
  }

  @property({ type: Array })
  private footerRelBlock = footerRelBlock;
  @property({ type: Object })
  private footerNewsletter = footerNewsletter;
  @property({ type: Object })
  private footerOrganizer = footerOrganizer;
  @property({ type: Object })
  private socialNetwork = socialNetwork;
  @property({ type: Object })
  private organizer = organizer;
  @property({ type: Object })
  private footer = footer;
  @property()
  private followOur = followOur;
  @property()
  private followUs = followUs;
  @property()
  private emailUs = emailUs;
  @property()
  private mailto = mailto;
  @property({ type: Object })
  private subscribeBlock = subscribeBlock;

  _computeBlogTarget(blogUrl: string): string {
    return blogUrl && blogUrl.startsWith('http') ? '_blank' : '';
  }
}
