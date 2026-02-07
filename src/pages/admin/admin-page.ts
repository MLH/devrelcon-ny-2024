import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getAuth, onAuthStateChanged, Unsubscribe, User } from 'firebase/auth';
import { firebaseApp } from '../../firebase.js';
import './shoelace-setup.js';
import './admin-list.js';
import './admin-form.js';
import './collections/schedule-form.js';
import './collections/config-form.js';
import './collections/speakers-history-form.js';
import { SCHEMAS } from './schemas/index.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

// Inject Shoelace light theme CSS at document level for design tokens
const SHOELACE_THEME_URL = 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css';

if (!document.querySelector(`link[href="${SHOELACE_THEME_URL}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SHOELACE_THEME_URL;
  document.head.appendChild(link);
}

const auth = getAuth(firebaseApp);

const NAV_SECTIONS = [
  {
    label: 'Content',
    items: [
      { label: 'Speakers', path: 'speakers' },
      { label: 'Sessions', path: 'sessions' },
      { label: 'Schedule', path: 'schedule' },
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
  @state() private currentView: 'list' | 'edit' | 'new' = 'list';
  @state() private currentEditId = '';
  @state() private parentId = '';
  @state() private subView: 'groups' | 'items' | 'group-edit' | 'group-new' | 'item-edit' | 'item-new' = 'groups';
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
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  private navigate(path: string) {
    this.currentSection = path;
    this.currentView = 'list';
    this.currentEditId = '';
    this.parentId = '';
    this.subView = 'groups';
    window.history.pushState({}, '', `/admin/${path}`);
  }

  private handleAction(e: CustomEvent) {
    const { action, id } = e.detail;
    switch (action) {
      case 'new':
        this.currentView = 'new';
        this.currentEditId = '';
        break;
      case 'edit':
        this.currentView = 'edit';
        this.currentEditId = id;
        break;
      case 'back':
        this.currentView = 'list';
        this.currentEditId = '';
        break;
    }
  }

  private sectionToSchemaKey(section: string): string {
    return section;
  }

  private renderContent() {
    // Schedule uses its own custom form
    if (this.currentSection === 'schedule') {
      if (this.currentView === 'list') {
        return html`<admin-list .schema=${SCHEMAS['schedule']} @admin-action=${this.handleAction}></admin-list>`;
      }
      return html`<schedule-form editId="${this.currentEditId}" @admin-action=${this.handleAction}></schedule-form>`;
    }

    // Config uses its own custom form
    if (this.currentSection === 'config') {
      if (this.currentView === 'list') {
        return html`<admin-list .schema=${SCHEMAS['config']} @admin-action=${this.handleAction}></admin-list>`;
      }
      return html`<config-form editId="${this.currentEditId}" @admin-action=${this.handleAction}></config-form>`;
    }

    // Speakers uses a custom form with history editing
    if (this.currentSection === 'speakers') {
      if (this.currentView === 'list') {
        return html`<admin-list .schema=${SCHEMAS['speakers']} @admin-action=${this.handleAction}></admin-list>`;
      }
      return html`<speakers-history-form editId="${this.currentEditId}" @admin-action=${this.handleAction}></speakers-history-form>`;
    }

    // Partners and team have subcollection navigation
    if (this.currentSection === 'partners') {
      return this.renderSubcollectionSection('partner-groups', 'partner-items', 'items');
    }
    if (this.currentSection === 'team') {
      return this.renderSubcollectionSection('team-groups', 'team-members', 'members');
    }

    // All other collections use generic list + form
    const schemaKey = this.sectionToSchemaKey(this.currentSection);
    const schema = SCHEMAS[schemaKey];
    if (!schema) return html`<p>Unknown section.</p>`;

    if (this.currentView === 'list') {
      return html`<admin-list .schema=${schema} @admin-action=${this.handleAction}></admin-list>`;
    }
    return html`<admin-form
      .schema=${schema}
      editId="${this.currentEditId}"
      @admin-action=${this.handleAction}
    ></admin-form>`;
  }

  private renderSubcollectionSection(groupSchemaKey: string, itemSchemaKey: string, subcollectionName: string) {
    const groupSchema = SCHEMAS[groupSchemaKey];
    const itemSchema = SCHEMAS[itemSchemaKey];
    if (!groupSchema || !itemSchema) return html`<p>Unknown section.</p>`;

    switch (this.subView) {
      case 'groups':
        return html`
          <admin-list
            .schema=${groupSchema}
            @admin-action=${(e: CustomEvent) => {
              const { action, id } = e.detail;
              if (action === 'new') { this.subView = 'group-new'; }
              else if (action === 'edit') { this.parentId = id; this.subView = 'items'; }
            }}
          ></admin-list>
        `;
      case 'group-new':
        return html`
          <admin-form
            .schema=${groupSchema}
            @admin-action=${(e: CustomEvent) => {
              if (e.detail.action === 'back') this.subView = 'groups';
            }}
          ></admin-form>
        `;
      case 'items':
        return html`
          <sl-button variant="text" @click=${() => { this.subView = 'groups'; this.parentId = ''; }}>
            <sl-icon name="arrow-left"></sl-icon> Back to ${groupSchema.displayName}
          </sl-button>
          <admin-list
            .schema=${itemSchema}
            parentPath="${groupSchema.collectionPath}"
            parentId="${this.parentId}"
            subcollection="${subcollectionName}"
            @admin-action=${(e: CustomEvent) => {
              const { action, id } = e.detail;
              if (action === 'new') this.subView = 'item-new';
              else if (action === 'edit') { this.currentEditId = id; this.subView = 'item-edit'; }
            }}
          ></admin-list>
        `;
      case 'item-new':
        return html`
          <admin-form
            .schema=${itemSchema}
            collectionPath="${groupSchema.collectionPath}/${this.parentId}/${subcollectionName}"
            @admin-action=${(e: CustomEvent) => {
              if (e.detail.action === 'back') this.subView = 'items';
            }}
          ></admin-form>
        `;
      case 'item-edit':
        return html`
          <admin-form
            .schema=${itemSchema}
            editId="${this.currentEditId}"
            collectionPath="${groupSchema.collectionPath}/${this.parentId}/${subcollectionName}"
            @admin-action=${(e: CustomEvent) => {
              if (e.detail.action === 'back') this.subView = 'items';
            }}
          ></admin-form>
        `;
      default:
        return html`<p>Unknown view.</p>`;
    }
  }
}
