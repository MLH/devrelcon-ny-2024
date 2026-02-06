import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getAuth, onAuthStateChanged, Unsubscribe, User } from 'firebase/auth';
import { firebaseApp } from '../../firebase.js';
import './shoelace-setup.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

const auth = getAuth(firebaseApp);

const NAV_SECTIONS = [
  {
    label: 'Content',
    items: [
      { label: 'Speakers', path: 'speakers' },
      { label: 'Sessions', path: 'sessions' },
      { label: 'Schedule', path: 'schedule' },
      { label: 'Previous Speakers', path: 'previous-speakers' },
    ],
  },
  {
    label: 'Event',
    items: [
      { label: 'Tickets', path: 'tickets' },
      { label: 'Partners', path: 'partners' },
      { label: 'Team', path: 'team' },
      { label: 'Videos', path: 'videos' },
      { label: 'Gallery', path: 'gallery' },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Blog', path: 'blog' },
      { label: 'Config', path: 'config' },
    ],
  },
];

@customElement('admin-page')
export class AdminPage extends LitElement {
  @state() private user: User | null = null;
  @state() private authChecked = false;
  @state() private currentSection = 'speakers';
  private unsubAuth: Unsubscribe | null = null;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
    }

    .layout {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 240px;
      background: var(--sl-color-neutral-50, #f8f9fa);
      border-right: 1px solid var(--sl-color-neutral-200, #e2e8f0);
      padding: 16px;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .sidebar h2 {
      font-size: 18px;
      margin: 0 0 16px 0;
      color: var(--sl-color-neutral-900);
    }

    .sidebar h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sl-color-neutral-500);
      margin: 16px 0 4px 0;
    }

    .nav-item {
      display: block;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--sl-color-neutral-700);
      text-decoration: none;
      font-size: 14px;
    }

    .nav-item:hover {
      background: var(--sl-color-neutral-100);
    }

    .nav-item.active {
      background: var(--sl-color-primary-100);
      color: var(--sl-color-primary-700);
      font-weight: 600;
    }

    .main {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .user-info {
      font-size: 12px;
      color: var(--sl-color-neutral-500);
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--sl-color-neutral-200);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    const pathParts = window.location.pathname.split('/');
    if (pathParts[2]) {
      this.currentSection = pathParts[2];
    }
    this.unsubAuth = onAuthStateChanged(auth, (user) => {
      this.user = user;
      this.authChecked = true;
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubAuth?.();
  }

  private get isAuthorized(): boolean {
    return !!this.user?.email?.endsWith('@majorleaguehacking.com');
  }

  override render() {
    if (!this.authChecked) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    if (!this.user) {
      return html`
        <div class="denied">
          <sl-alert variant="warning" open>
            <sl-icon slot="icon" name="lock"></sl-icon>
            Please sign in to access the admin panel.
          </sl-alert>
          <sl-button variant="primary" @click=${() => window.location.href = '/'}>Go to Home</sl-button>
        </div>
      `;
    }

    if (!this.isAuthorized) {
      return html`
        <div class="denied">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="shield-x"></sl-icon>
            Access denied. Admin panel is restricted to @majorleaguehacking.com accounts.
          </sl-alert>
          <sl-button variant="primary" @click=${() => window.location.href = '/'}>Go to Home</sl-button>
        </div>
      `;
    }

    return html`
      <div class="layout">
        <nav class="sidebar">
          <h2>Admin</h2>
          ${NAV_SECTIONS.map(
            (section) => html`
              <h3>${section.label}</h3>
              ${section.items.map(
                (item) => html`
                  <a
                    class="nav-item ${this.currentSection === item.path ? 'active' : ''}"
                    @click=${() => this.navigate(item.path)}
                  >
                    ${item.label}
                  </a>
                `,
              )}
            `,
          )}
          <div class="user-info">${this.user.email}</div>
        </nav>
        <div class="main">
          <slot></slot>
        </div>
      </div>
    `;
  }

  private navigate(path: string) {
    this.currentSection = path;
    window.history.pushState({}, '', `/admin/${path}`);
    this.dispatchEvent(new CustomEvent('admin-navigate', { detail: { path }, bubbles: true, composed: true }));
  }
}
