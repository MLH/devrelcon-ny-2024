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
  'Subject: Request to attend DevRelCon NYC — July 17-18, 2025',
  '',
  'Hi [Manager],',
  '',
  "I'd like to attend DevRelCon NYC on July 17-18 in Brooklyn, NY. It's the leading conference for teams building developer adoption — covering developer relations, developer experience, product marketing, and go-to-market strategy for developer platforms.",
  '',
  "Here's why I think it's worth the investment:",
  '',
  '- Directly relevant sessions: There are talks on [mention 2-3 specific topics relevant to your role], which are directly applicable to what we\'re working on with [your project/product].',
  '- Networking: 300 practitioners from companies like [list 3-4 companies] attend. This is a great opportunity to learn how other teams approach [challenge your team faces].',
  "- Actionable takeaways: Sessions are practitioner-led and focused on real-world application. I'll share key learnings with the team when I return.",
  '',
  'The cost breakdown:',
  '- Conference ticket: $699',
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
          Getting approval to attend a conference isn't always easy — especially
          when your company doesn't have a dedicated DevRel budget. We've put
          together everything you need to make the case to your manager,
          including a ready-to-send email template.
        </p>

        <div class="section">
          <h2 class="section-title">What You'll Get</h2>
          <p>
            DevRelCon isn't a vendor pitch-fest or an academic symposium. It's
            two days of practical, experience-based sessions from people doing
            the work at companies like Google, MongoDB, Cloudflare, HubSpot,
            LaunchDarkly, and Pinecone. Here's what you'll bring back:
          </p>
          <ul>
            <li>
              Actionable frameworks for developer adoption, community growth,
              and developer-first GTM
            </li>
            <li>
              Benchmarking data: how other teams measure ROI, staff programs,
              and structure orgs
            </li>
            <li>
              New approaches to AI developer tooling, platform strategy, and
              developer experience
            </li>
            <li>
              Connections with 300 practitioners facing the same challenges —
              many become long-term collaborators
            </li>
            <li>
              Workshop materials, templates, and playbooks you can share with
              your team
            </li>
          </ul>
        </div>

        <div class="section">
          <h2 class="section-title">The Numbers</h2>
          <ul class="numbers-list">
            <li>2 days of programming (40 sessions, 3 tracks)</li>
            <li>
              Ticket includes all sessions, breakfast, lunch, coffee, and an
              evening reception
            </li>
            <li>Industry City, Brooklyn — 20 minutes from Manhattan</li>
            <li>
              $699 regular / $549 early bird (when available) / $1,099 supporter
            </li>
          </ul>
        </div>

        <div class="section">
          <h2 class="section-title">Who Else Attends</h2>
          <p>
            DevRelCon attracts practitioners and leaders from companies like
            Block, Cloudflare, Google, MongoDB, HubSpot, LaunchDarkly,
            Pinecone, ElevenLabs, Neo4j, Elastic. The audience spans Developer
            Relations, Developer Experience, Product Marketing, Product
            Management, and Go-to-Market leadership.
          </p>
        </div>

        <div class="section">
          <h2 class="section-title">Email Template</h2>
          <p>
            Copy the email below, customize the bracketed sections, and send it
            to your manager.
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
