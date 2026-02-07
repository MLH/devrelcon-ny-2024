import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CollectionSchema, FieldSchema, toSlug } from './schemas/index.js';
import { DocWithId, fetchCollection, fetchDocument, saveDocument, nextPaddedId } from './admin-firestore.js';
import './admin-image-upload.js';
import './admin-repeater.js';
import { RepeaterField } from './admin-repeater.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

const SOCIAL_FIELDS: RepeaterField[] = [
  { name: 'name', label: 'Platform', placeholder: 'e.g. twitter' },
  { name: 'link', label: 'URL', placeholder: 'https://...' },
  { name: 'icon', label: 'Icon', placeholder: 'e.g. twitter' },
];

const BADGE_FIELDS: RepeaterField[] = [
  { name: 'name', label: 'Name' },
  { name: 'description', label: 'Description' },
  { name: 'link', label: 'URL' },
];

@customElement('admin-form')
export class AdminForm extends LitElement {
  @property({ type: Object }) schema!: CollectionSchema;
  @property({ type: String }) editId = '';
  @property({ type: String }) collectionPath = '';

  @state() private data: Record<string, unknown> = {};
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private docId = '';
  @state() private speakerOptions: { value: string; label: string }[] = [];
  @state() private tagOptions: { value: string; label: string }[] = [];
  @state() private existingIds: string[] = [];

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

    h1 {
      font-size: 24px;
      margin: 0;
    }

    .field {
      margin-bottom: 16px;
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

    .id-preview {
      font-size: 12px;
      color: var(--sl-color-neutral-500);
      margin-top: 4px;
    }

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
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private get effectivePath(): string {
    return this.collectionPath || this.schema.collectionPath;
  }

  private get isEditing(): boolean {
    return this.editId !== '';
  }

  private async loadData() {
    this.loading = true;

    // Load speaker options for sessions that reference speakers
    if (this.schema.fields.some((f) => f.name === 'speakers' && f.type === 'multiselect')) {
      try {
        const speakers = await fetchCollection('speakers', 'name');
        this.speakerOptions = speakers.map((s) => ({
          value: s.id,
          label: (s['name'] as string) || s.id,
        }));
      } catch {
        this.speakerOptions = [];
      }
    }

    // Load tag options for sessions
    if (this.schema.fields.some((f) => f.name === 'tags' && f.type === 'multiselect')) {
      try {
        const allSessions = await fetchCollection('sessions', 'title');
        const tagSet = new Set<string>();
        allSessions.forEach((s) => {
          const tags = s['tags'] as string[] | undefined;
          if (tags) tags.forEach((t) => tagSet.add(t));
        });
        this.tagOptions = Array.from(tagSet).sort().map((t) => ({ value: t, label: t }));
      } catch {
        this.tagOptions = [];
      }
    }

    // Load existing IDs for padded ID generation
    try {
      const existing = await fetchCollection(this.effectivePath, this.schema.orderField);
      this.existingIds = existing.map((d) => d.id);
    } catch {
      this.existingIds = [];
    }

    if (this.isEditing) {
      const doc = await fetchDocument(this.effectivePath, this.editId);
      if (doc) {
        this.data = doc;
        this.docId = doc.id;
      }
    } else {
      // Set defaults
      this.data = {};
      this.schema.fields.forEach((f) => {
        if (f.type === 'boolean') this.data[f.name] = false;
        if (f.type === 'number') this.data[f.name] = 0;
        if (f.type === 'socials' || f.type === 'badges') this.data[f.name] = [];
        if (f.type === 'multiselect') this.data[f.name] = [];
      });

      if (this.schema.idStrategy === 'padded') {
        this.docId = nextPaddedId(this.existingIds);
      }
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
        <h1>${this.isEditing ? 'Edit' : 'New'} ${this.schema.displayName}</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert variant="${this.message.type}" open closable @sl-after-hide=${() => (this.message = null)}>
              ${this.message.text}
            </sl-alert>
          `
        : nothing}

      ${this.renderIdField()}

      ${this.schema.fields.map((field) => this.renderField(field))}

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isEditing ? 'Save Changes' : 'Create'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private renderIdField() {
    if (this.isEditing) {
      return html`
        <div class="id-field">
          <label>Document ID</label>
          <sl-input value="${this.docId}" disabled></sl-input>
        </div>
      `;
    }

    switch (this.schema.idStrategy) {
      case 'slug':
        return html`
          <div class="id-field">
            <label>Document ID (auto-generated from ${this.schema.slugField})</label>
            <sl-input value="${this.docId || '(will be generated)'}" disabled></sl-input>
          </div>
        `;
      case 'padded':
        return html`
          <div class="id-field">
            <label>Document ID (auto-generated)</label>
            <sl-input value="${this.docId}" disabled></sl-input>
          </div>
        `;
      case 'input':
        return html`
          <div class="id-field">
            <label>Document ID</label>
            <sl-input
              value="${this.docId}"
              required
              placeholder="Enter a unique document ID"
              @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;
      case 'date':
        return html`
          <div class="id-field">
            <label>Document ID (date)</label>
            <sl-input
              type="date"
              value="${this.docId}"
              required
              @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;
      default:
        return nothing;
    }
  }

  private renderField(field: FieldSchema) {
    const value = this.data[field.name];

    switch (field.type) {
      case 'string':
      case 'date':
      case 'time':
        return html`
          <div class="field">
            <sl-input
              label="${field.label}"
              type="${field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              placeholder="${field.placeholder || ''}"
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as HTMLInputElement).value)}
            ></sl-input>
          </div>
        `;

      case 'number':
        return html`
          <div class="field">
            <sl-input
              label="${field.label}"
              type="number"
              value="${value ?? ''}"
              ?required=${field.required}
              @sl-change=${(e: Event) => this.setField(field.name, Number((e.target as HTMLInputElement).value))}
            ></sl-input>
          </div>
        `;

      case 'boolean':
        return html`
          <div class="field">
            <sl-switch
              ?checked=${!!value}
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as HTMLInputElement).checked)}
            >${field.label}</sl-switch>
          </div>
        `;

      case 'textarea':
        return html`
          <div class="field">
            <sl-textarea
              label="${field.label}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              rows="4"
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as HTMLInputElement).value)}
            ></sl-textarea>
          </div>
        `;

      case 'image':
        return html`
          <div class="field">
            <admin-image-upload
              label="${field.label}"
              value="${(value as string) || ''}"
              collection="${field.uploadCollection || ''}"
              @image-uploaded=${(e: CustomEvent) => this.setField(field.name, e.detail.url)}
            ></admin-image-upload>
          </div>
        `;

      case 'select':
        return html`
          <div class="field">
            <sl-select
              label="${field.label}"
              value="${(value as string) || ''}"
              ?required=${field.required}
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as HTMLSelectElement).value)}
            >
              <sl-option value="">-- Select --</sl-option>
              ${(field.options || []).map(
                (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
              )}
            </sl-select>
          </div>
        `;

      case 'multiselect':
        return html`
          <div class="field">
            <sl-select
              label="${field.label}"
              multiple
              clearable
              .value=${(value as string[]) || []}
              @sl-change=${(e: Event) => this.setField(field.name, (e.target as any).value)}
            >
              ${field.name === 'speakers'
                ? this.speakerOptions.map(
                    (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
                  )
                : field.name === 'tags'
                  ? this.tagOptions.map(
                      (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
                    )
                  : (field.options || []).map(
                      (opt) => html`<sl-option value="${opt.value}">${opt.label}</sl-option>`,
                    )}
            </sl-select>
          </div>
        `;

      case 'socials':
        return html`
          <div class="field">
            <admin-repeater
              label="${field.label}"
              .fields=${SOCIAL_FIELDS}
              .value=${(value as Record<string, string>[]) || []}
              @value-changed=${(e: CustomEvent) => this.setField(field.name, e.detail.value)}
            ></admin-repeater>
          </div>
        `;

      case 'badges':
        return html`
          <div class="field">
            <admin-repeater
              label="${field.label}"
              .fields=${BADGE_FIELDS}
              .value=${(value as Record<string, string>[]) || []}
              @value-changed=${(e: CustomEvent) => this.setField(field.name, e.detail.value)}
            ></admin-repeater>
          </div>
        `;

      default:
        return nothing;
    }
  }

  private setField(name: string, value: unknown) {
    this.data = { ...this.data, [name]: value };

    // Auto-generate slug for ID
    if (!this.isEditing && this.schema.idStrategy === 'slug' && name === this.schema.slugField) {
      this.docId = toSlug(value as string);
    }
  }

  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Document ID is required.' };
      return;
    }

    this.saving = true;
    try {
      await saveDocument(this.effectivePath, this.docId, this.data);
      this.message = { type: 'success', text: 'Saved successfully!' };
      if (!this.isEditing) {
        // After creating, switch to edit mode
        this.editId = this.docId;
      }
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
