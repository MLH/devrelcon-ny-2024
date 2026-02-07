import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchDocument, saveDocument } from '../admin-firestore.js';
import '../admin-image-upload.js';
import '../admin-repeater.js';
import { RepeaterField } from '../admin-repeater.js';
import { toSlug } from '../schemas/index.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

interface PreviousSession {
  title: string;
  tags?: string[];
  presentation?: string;
  videoId?: string;
}

interface YearGroup {
  year: string;
  bio: string;
  company: string;
  title: string;
  talks: PreviousSession[];
}

const SOCIAL_FIELDS: RepeaterField[] = [
  { name: 'name', label: 'Platform', placeholder: 'e.g. twitter' },
  { name: 'link', label: 'URL', placeholder: 'https://...' },
  { name: 'icon', label: 'Icon', placeholder: 'e.g. twitter' },
];

@customElement('speakers-history-form')
export class SpeakersHistoryForm extends LitElement {
  @property({ type: String }) editId = '';

  @state() private data: Record<string, unknown> = {};
  @state() private yearGroups: YearGroup[] = [];
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private docId = '';
  @state() private isNew = false;

  static override styles = css`
    :host {
      display: block;
      max-width: 700px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    h1, h2 { margin: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin: 24px 0 12px; }

    .field { margin-bottom: 16px; }

    .year-group {
      border: 1px solid var(--sl-color-neutral-200);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .year-header {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .year-header sl-input { width: 120px; }

    .session-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      margin-bottom: 8px;
      background: var(--sl-color-neutral-50);
      border-radius: 4px;
    }

    .session-row-header {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .session-row-header sl-input { flex: 1; }

    .session-details {
      display: flex;
      gap: 8px;
    }

    .session-details sl-input { flex: 1; }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .id-field {
      margin-bottom: 16px;
    }

    .id-field label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--sl-color-neutral-700);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;

    if (this.editId) {
      const doc = await fetchDocument('speakers', this.editId);
      if (doc) {
        this.data = doc;
        this.docId = doc.id;

        // Parse history from { [year]: YearSnapshot } to YearGroup[]
        const history = (doc['history'] as Record<string, YearGroup>) || {};
        this.yearGroups = Object.entries(history).map(([year, snapshot]) => ({
          year,
          bio: (snapshot as any).bio || '',
          company: (snapshot as any).company || '',
          title: (snapshot as any).title || '',
          talks: (snapshot as any).talks || [],
        }));
      }
    } else {
      this.isNew = true;
      this.data = { order: 0, socials: [], active: true };
    }

    this.loading = false;
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`;
    }

    return html`
      <div class="header">
        <sl-button variant="text" @click=${this.handleBack}>
          <sl-icon name="arrow-left"></sl-icon>
        </sl-button>
        <h1>${this.isNew ? 'New' : 'Edit'} Speaker</h1>
      </div>

      ${this.message
        ? html`<sl-alert variant="${this.message.type}" open closable @sl-after-hide=${() => (this.message = null)}>${this.message.text}</sl-alert>`
        : nothing}

      <div class="id-field">
        <label>Document ID ${this.isNew ? '(auto-generated from name)' : ''}</label>
        <sl-input value="${this.docId || '(will be generated)'}" disabled></sl-input>
      </div>

      <!-- Standard fields -->
      <div class="field">
        <sl-input label="Name" value="${(this.data['name'] as string) || ''}" required
          @sl-change=${(e: Event) => { this.setField('name', (e.target as HTMLInputElement).value); if (this.isNew) this.docId = toSlug((e.target as HTMLInputElement).value); }}
        ></sl-input>
      </div>
      <div class="field">
        <sl-input label="Job Title" value="${(this.data['title'] as string) || ''}"
          @sl-change=${(e: Event) => this.setField('title', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <sl-input label="Company" value="${(this.data['company'] as string) || ''}"
          @sl-change=${(e: Event) => this.setField('company', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <sl-input label="Country" value="${(this.data['country'] as string) || ''}"
          @sl-change=${(e: Event) => this.setField('country', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <sl-input label="Pronouns" value="${(this.data['pronouns'] as string) || ''}" placeholder="e.g. she/her"
          @sl-change=${(e: Event) => this.setField('pronouns', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <sl-textarea label="Bio" value="${(this.data['bio'] as string) || ''}" rows="4"
          @sl-change=${(e: Event) => this.setField('bio', (e.target as HTMLInputElement).value)}
        ></sl-textarea>
      </div>
      <div class="field">
        <sl-textarea label="Short Bio" value="${(this.data['shortBio'] as string) || ''}" rows="2"
          @sl-change=${(e: Event) => this.setField('shortBio', (e.target as HTMLInputElement).value)}
        ></sl-textarea>
      </div>
      <div class="field">
        <admin-image-upload label="Photo" value="${(this.data['photoUrl'] as string) || ''}" collection="speakers"
          @image-uploaded=${(e: CustomEvent) => this.setField('photoUrl', e.detail.url)}
        ></admin-image-upload>
      </div>
      <div class="field">
        <sl-input label="Photo Path" value="${(this.data['photo'] as string) || ''}"
          @sl-change=${(e: Event) => this.setField('photo', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <sl-input label="Company Logo Path" value="${(this.data['companyLogo'] as string) || ''}"
          @sl-change=${(e: Event) => this.setField('companyLogo', (e.target as HTMLInputElement).value)}
        ></sl-input>
      </div>
      <div class="field">
        <admin-image-upload label="Company Logo" value="${(this.data['companyLogoUrl'] as string) || ''}" collection="speakers"
          @image-uploaded=${(e: CustomEvent) => this.setField('companyLogoUrl', e.detail.url)}
        ></admin-image-upload>
      </div>
      <div class="field">
        <sl-input label="Display Order" type="number" value="${this.data['order'] ?? 0}" required
          @sl-change=${(e: Event) => this.setField('order', Number((e.target as HTMLInputElement).value))}
        ></sl-input>
      </div>
      <div class="field">
        <sl-switch ?checked=${!!this.data['featured']}
          @sl-change=${(e: Event) => this.setField('featured', (e.target as HTMLInputElement).checked)}
        >Featured</sl-switch>
      </div>
      <div class="field">
        <sl-switch ?checked=${!!this.data['active']}
          @sl-change=${(e: Event) => this.setField('active', (e.target as HTMLInputElement).checked)}
        >Active (speaking this year)</sl-switch>
      </div>
      <div class="field">
        <admin-repeater label="Social Links" .fields=${SOCIAL_FIELDS}
          .value=${(this.data['socials'] as Record<string, string>[]) || []}
          @value-changed=${(e: CustomEvent) => this.setField('socials', e.detail.value)}
        ></admin-repeater>
      </div>

      <!-- History by Year -->
      <h2>History by Year</h2>
      ${this.yearGroups.map((yg, yi) => this.renderYearGroup(yg, yi))}
      <sl-button size="small" @click=${this.addYear}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Year
      </sl-button>

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isNew ? 'Create' : 'Save Changes'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private renderYearGroup(yg: YearGroup, yi: number) {
    return html`
      <div class="year-group">
        <div class="year-header">
          <sl-input label="Year" value="${yg.year}" placeholder="e.g. 2024"
            @sl-change=${(e: Event) => this.updateYear(yi, (e.target as HTMLInputElement).value)}
          ></sl-input>
          <sl-icon-button name="trash" label="Remove year" style="color: var(--sl-color-danger-600);"
            @click=${() => this.removeYear(yi)}
          ></sl-icon-button>
        </div>
        <div class="field">
          <sl-input label="Job Title (that year)" size="small" value="${yg.title}"
            @sl-change=${(e: Event) => this.updateYearField(yi, 'title', (e.target as HTMLInputElement).value)}
          ></sl-input>
        </div>
        <div class="field">
          <sl-input label="Company (that year)" size="small" value="${yg.company}"
            @sl-change=${(e: Event) => this.updateYearField(yi, 'company', (e.target as HTMLInputElement).value)}
          ></sl-input>
        </div>
        <div class="field">
          <sl-textarea label="Bio (that year)" size="small" value="${yg.bio}" rows="3"
            @sl-change=${(e: Event) => this.updateYearField(yi, 'bio', (e.target as HTMLInputElement).value)}
          ></sl-textarea>
        </div>
        ${yg.talks.map((session, si) => html`
          <div class="session-row">
            <div class="session-row-header">
              <sl-input size="small" placeholder="Talk title" value="${session.title}"
                @sl-change=${(e: Event) => this.updateSession(yi, si, 'title', (e.target as HTMLInputElement).value)}
              ></sl-input>
              <sl-icon-button name="x-lg" label="Remove talk"
                @click=${() => this.removeSession(yi, si)}
              ></sl-icon-button>
            </div>
            <div class="session-details">
              <sl-input size="small" placeholder="Tags (comma-separated)" value="${(session.tags || []).join(', ')}"
                @sl-change=${(e: Event) => this.updateSessionTags(yi, si, (e.target as HTMLInputElement).value)}
              ></sl-input>
              <sl-input size="small" placeholder="Presentation URL" value="${session.presentation || ''}"
                @sl-change=${(e: Event) => this.updateSession(yi, si, 'presentation', (e.target as HTMLInputElement).value)}
              ></sl-input>
              <sl-input size="small" placeholder="Video ID" value="${session.videoId || ''}"
                @sl-change=${(e: Event) => this.updateSession(yi, si, 'videoId', (e.target as HTMLInputElement).value)}
              ></sl-input>
            </div>
          </div>
        `)}
        <sl-button size="small" @click=${() => this.addSession(yi)}>
          <sl-icon slot="prefix" name="plus-lg"></sl-icon>
          Add Talk
        </sl-button>
      </div>
    `;
  }

  private setField(name: string, value: unknown) {
    this.data = { ...this.data, [name]: value };
  }

  private addYear() {
    this.yearGroups = [...this.yearGroups, { year: '', bio: '', company: '', title: '', talks: [] }];
  }

  private removeYear(index: number) {
    this.yearGroups = this.yearGroups.filter((_, i) => i !== index);
  }

  private updateYear(index: number, year: string) {
    const groups = [...this.yearGroups];
    const existing = groups[index];
    if (!existing) return;
    groups[index] = { ...existing, year };
    this.yearGroups = groups;
  }

  private updateYearField(index: number, field: string, value: string) {
    const groups = [...this.yearGroups];
    const existing = groups[index];
    if (!existing) return;
    groups[index] = { ...existing, [field]: value };
    this.yearGroups = groups;
  }

  private addSession(yearIndex: number) {
    const groups = [...this.yearGroups];
    const existing = groups[yearIndex];
    if (!existing) return;
    groups[yearIndex] = {
      ...existing,
      talks: [...existing.talks, { title: '' }],
    };
    this.yearGroups = groups;
  }

  private removeSession(yearIndex: number, sessionIndex: number) {
    const groups = [...this.yearGroups];
    const existing = groups[yearIndex];
    if (!existing) return;
    groups[yearIndex] = {
      ...existing,
      talks: existing.talks.filter((_, i) => i !== sessionIndex),
    };
    this.yearGroups = groups;
  }

  private updateSession(yearIndex: number, sessionIndex: number, field: string, value: string) {
    const groups = [...this.yearGroups];
    const yearGroup = groups[yearIndex];
    if (!yearGroup) return;
    const talks = [...yearGroup.talks];
    const existing = talks[sessionIndex];
    if (!existing) return;
    talks[sessionIndex] = { ...existing, [field]: value };
    groups[yearIndex] = { ...yearGroup, talks };
    this.yearGroups = groups;
  }

  private updateSessionTags(yearIndex: number, sessionIndex: number, tagsStr: string) {
    const tags = tagsStr.split(',').map((t) => t.trim()).filter((t) => t);
    const groups = [...this.yearGroups];
    const yearGroup = groups[yearIndex];
    if (!yearGroup) return;
    const talks = [...yearGroup.talks];
    const existing = talks[sessionIndex];
    if (!existing) return;
    talks[sessionIndex] = { ...existing, tags };
    groups[yearIndex] = { ...yearGroup, talks };
    this.yearGroups = groups;
  }

  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Name is required to generate document ID.' };
      return;
    }

    // Convert yearGroups back to { [year]: YearSnapshot }
    const history: Record<string, unknown> = {};
    this.yearGroups.forEach((yg) => {
      if (yg.year) {
        history[yg.year] = {
          bio: yg.bio,
          company: yg.company,
          title: yg.title,
          talks: yg.talks,
        };
      }
    });

    this.saving = true;
    try {
      await saveDocument('speakers', this.docId, { ...this.data, history });
      this.message = { type: 'success', text: 'Saved successfully!' };
      if (this.isNew) this.isNew = false;
    } catch (error) {
      this.message = { type: 'danger', text: `Save failed: ${error}` };
    }
    this.saving = false;
  }

  private handleBack() {
    this.dispatchEvent(
      new CustomEvent('admin-action', { detail: { action: 'back' }, bubbles: true, composed: true }),
    );
  }
}
