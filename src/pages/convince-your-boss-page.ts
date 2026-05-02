import { customElement, property } from '@polymer/decorators';
import '@polymer/paper-button';
import { html, PolymerElement } from '@polymer/polymer';
import '../components/hero/simple-hero';
import '../elements/footer-block';
import { store } from '../store';
import { queueSnackbar } from '../store/snackbars';
import { heroSettings } from '../utils/data';
import { updateMetadata } from '../utils/metadata';

/* eslint-disable max-len */
const EMAIL_TEMPLATE_LINES = [
  'Subject: Request to attend DevRelCon NYC — July 22-23, 2026',
  '',
  'Hi [Manager],',
  '',
  "I'd like to attend DevRelCon NYC on July 22-23 in Brooklyn, NY. It's the leading conference for developer go-to-market teams — covering developer relations, developer experience, product marketing, and GTM strategy for developer platforms.",
  '',
  "Here's why I think it's worth the investment:",
  '',
  '- Metrics frameworks I can implement immediately to attribute our developer program impact to pipeline and retention.',
  '- Firsthand data on how peer companies are structuring and staffing developer GTM in the AI era.',
  '- Playbooks for technical content strategy, developer platform distribution, and agentic DX.',
  '- Direct relationships with 300 practitioners and leaders from companies like Google, Cloudflare, MongoDB, HubSpot, ElevenLabs, and more.',
  '',
  'The cost breakdown:',
  '- Conference ticket: $450 early bird / $699 regular',
  '- Estimated travel: $[X]',
  '- Estimated hotel (1-2 nights): $[X]',
  '- Total: $[X]',
  '',
  "I'm happy to write up a summary of key learnings and present to the team afterward.",
  '',
  '[Your name]',
];
/* eslint-enable max-len */
const EMAIL_TEMPLATE = EMAIL_TEMPLATE_LINES.join('\n');

@customElement('convince-your-boss-page')
export class ConvinceYourBossPage extends PolymerElement {
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

        .section {
          margin-bottom: 48px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin-bottom: 16px;
          padding: 0;
          line-height: 1.3;
        }

        .section p {
          font-size: 16px;
          line-height: 1.6;
          color: var(--primary-text-color);
          margin: 0 0 16px;
        }

        .section ul {
          margin: 0 0 16px;
          padding-left: 24px;
        }

        .section li {
          font-size: 16px;
          line-height: 1.6;
          color: var(--primary-text-color);
          margin-bottom: 8px;
        }

        .numbers-list {
          list-style: none;
          padding-left: 0;
        }

        .numbers-list li {
          padding-left: 0;
          position: relative;
        }

        .numbers-list li::before {
          content: none;
        }

        .email-template-container {
          position: relative;
          background-color: var(--secondary-background-color);
          border-radius: var(--border-radius);
          padding: 24px;
          margin-top: 16px;
        }

        .email-template {
          white-space: pre-wrap;
          font-family: var(--font-family);
          font-size: 14px;
          line-height: 1.7;
          color: var(--primary-text-color);
          margin: 0;
        }

        .copy-button-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .copy-button {
          background-color: var(--default-primary-color);
          color: var(--text-primary-color);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 24px;
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: background-color var(--animation);
        }

        .copy-button:hover {
          background-color: var(--primary-color-light);
        }

        .cta-section {
          text-align: center;
          padding: 32px 0;
          margin-top: 16px;
        }

        .cta-section a {
          text-decoration: none;
        }

        .cta-button {
          background-color: var(--default-primary-color);
          color: var(--text-primary-color);
          font-size: 16px;
          font-weight: 500;
          padding: 12px 32px;
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

      <simple-hero page="convinceYourBoss"></simple-hero>

      <div class="container">
        <p class="intro">
          Your manager doesn't care about the sessions. They care about whether sending you is worth
          the budget. Here's how to make that case — with a ready-to-send email that speaks their
          language.
        </p>

        <div class="section">
          <h2 class="section-title">What You'll Take Back on Monday Morning</h2>
          <p>
            DevRelCon 2026 is built around the two things developer GTM teams are being asked to
            solve right now: proving ROI on developer work, and adapting to an industry shifting
            toward agentic development. Three days of practitioner-led sessions — no vendor pitches,
            no academic theory.
          </p>
          <ul>
            <li>
              Metrics frameworks you can implement immediately to attribute developer program impact
              to pipeline and retention
            </li>
            <li>
              Firsthand data on how peer companies are structuring and staffing developer GTM in the
              AI era
            </li>
            <li>
              Playbooks for technical content strategy, developer platform distribution, and agentic
              DX
            </li>
            <li>
              Direct relationships with 300 practitioners and leaders from companies like Google,
              Cloudflare, MongoDB, HubSpot, ElevenLabs, and more
            </li>
          </ul>
        </div>

        <div class="section">
          <h2 class="section-title">The Numbers</h2>
          <ul class="numbers-list">
            <li>July 22–23, 2026 · Industry City, Brooklyn</li>
            <li>3 days · 40+ sessions · 3 tracks</li>
            <li>Early Bird: $450 · Regular: $699 · Supporter: $1,000</li>
            <li>Ticket includes all sessions, breakfast, lunch, coffee, and evening reception</li>
            <li>20 minutes from Manhattan</li>
          </ul>
        </div>

        <div class="section">
          <h2 class="section-title">Who Else Attends</h2>
          <p>
            DevRel practitioners, GTM Engineers, Developer Marketers, Product Marketing leads, CMOs,
            and founders from companies including Block, Cloudflare, Google, MongoDB, HubSpot,
            LaunchDarkly, Pinecone, ElevenLabs, Neo4j, and Elastic.
          </p>
        </div>

        <div class="section">
          <h2 class="section-title">Email Template</h2>
          <p>
            Copy the email below, customize the bracketed sections, and send it to your manager.
          </p>
          <div class="email-template-container">
            <pre class="email-template">[[emailTemplate]]</pre>
          </div>
          <div class="copy-button-container">
            <paper-button class="copy-button" on-click="copyEmail">
              Copy to Clipboard
            </paper-button>
          </div>
        </div>

        <div class="cta-section">
          <a href="/#tickets-block">
            <paper-button class="cta-button">Get Your Ticket</paper-button>
          </a>
        </div>
      </div>

      <footer-block></footer-block>
    `;
  }

  private heroSettings = heroSettings.convinceYourBoss;

  @property({ type: String })
  emailTemplate = EMAIL_TEMPLATE;

  override connectedCallback() {
    super.connectedCallback();
    updateMetadata(this.heroSettings.title, this.heroSettings.metaDescription);
  }

  private async copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL_TEMPLATE);
      store.dispatch(queueSnackbar('Email template copied to clipboard!'));
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = EMAIL_TEMPLATE;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        store.dispatch(queueSnackbar('Email template copied to clipboard!'));
      } catch {
        store.dispatch(queueSnackbar('Failed to copy. Please select and copy the text manually.'));
      }
      document.body.removeChild(textArea);
    }
  }
}
