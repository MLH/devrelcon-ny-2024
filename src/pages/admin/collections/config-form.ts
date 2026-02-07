import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchDocument, saveDocument } from '../admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

@customElement('config-form')
export class ConfigForm extends LitElement {
  @property({ type: String }) editId = '';

  @state() private jsonText = '';
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private isNew = false;
  @state() private docId = '';

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

    h1 { font-size: 24px; margin: 0; }

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
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    if (this.editId) {
      const doc = await fetchDocument('config', this.editId);
      if (doc) {
        const { id, ...data } = doc;
        this.jsonText = JSON.stringify(data, null, 2);
        this.docId = this.editId;
      }
    } else {
      this.isNew = true;
      this.jsonText = '{\n  \n}';
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
        <h1>${this.isNew ? 'New' : 'Edit'} Config: ${this.docId || ''}</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert variant="${this.message.type}" open closable @sl-after-hide=${() => (this.message = null)}>
              ${this.message.text}
            </sl-alert>
          `
        : nothing}

      ${this.isNew
        ? html`
            <div class="id-field">
              <sl-input
                label="Config Key"
                value="${this.docId}"
                placeholder="e.g. schedule, notifications, mailchimp"
                @sl-change=${(e: Event) => (this.docId = (e.target as HTMLInputElement).value)}
              ></sl-input>
            </div>
          `
        : nothing}

      <sl-textarea
        label="Config JSON"
        value="${this.jsonText}"
        rows="15"
        style="font-family: monospace;"
        @sl-change=${(e: Event) => (this.jsonText = (e.target as HTMLTextAreaElement).value)}
      ></sl-textarea>

      <sl-divider></sl-divider>

      <div class="actions">
        <sl-button variant="primary" ?loading=${this.saving} @click=${this.handleSave}>
          ${this.isNew ? 'Create' : 'Save Changes'}
        </sl-button>
        <sl-button variant="default" @click=${this.handleBack}>Cancel</sl-button>
      </div>
    `;
  }

  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Config key is required.' };
      return;
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(this.jsonText);
    } catch {
      this.message = { type: 'danger', text: 'Invalid JSON.' };
      return;
    }

    this.saving = true;
    try {
      await saveDocument('config', this.docId, data);
      this.message = { type: 'success', text: 'Config saved!' };
      this.isNew = false;
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
