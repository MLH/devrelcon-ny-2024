import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CollectionSchema } from './schemas/index.js';
import { DocWithId, fetchCollection, removeDocument } from './admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

@customElement('admin-list')
export class AdminList extends LitElement {
  @property({ type: Object }) schema!: CollectionSchema;
  @property({ type: String }) parentPath = '';
  @property({ type: String }) parentId = '';
  @property({ type: String }) subcollection = '';

  @state() private items: DocWithId[] = [];
  @state() private loading = true;
  @state() private deleteTarget: DocWithId | null = null;

  static override styles = css`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 24px;
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--sl-color-neutral-200);
      font-size: 14px;
    }

    th {
      font-weight: 600;
      color: var(--sl-color-neutral-600);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    tr:hover td {
      background: var(--sl-color-neutral-50);
    }

    .actions {
      display: flex;
      gap: 4px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty {
      text-align: center;
      padding: 40px;
      color: var(--sl-color-neutral-500);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private get collectionPath(): string {
    if (this.subcollection && this.parentPath && this.parentId) {
      return `${this.parentPath}/${this.parentId}/${this.subcollection}`;
    }
    return this.schema.collectionPath;
  }

  async loadData() {
    this.loading = true;
    try {
      this.items = await fetchCollection(this.collectionPath, this.schema.orderField);
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
    this.loading = false;
  }

  override render() {
    return html`
      <div class="header">
        <h1>${this.schema.displayName}</h1>
        <sl-button variant="primary" @click=${this.handleNew}>
          <sl-icon slot="prefix" name="plus-lg"></sl-icon>
          New
        </sl-button>
      </div>

      ${this.loading
        ? html`<div class="loading"><sl-spinner style="font-size: 2rem;"></sl-spinner></div>`
        : this.items.length === 0
          ? html`<div class="empty">No items yet. Click "New" to create one.</div>`
          : html`
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    ${this.schema.listFields.map((f) => html`<th>${f}</th>`)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.items.map(
                    (item) => html`
                      <tr>
                        <td>${item.id}</td>
                        ${this.schema.listFields.map((f) => html`
                          <td>${this.renderFieldValue(item[f])}</td>
                        `)}
                        <td class="actions">
                          <sl-icon-button
                            name="pencil"
                            label="Edit"
                            @click=${() => this.handleEdit(item)}
                          ></sl-icon-button>
                          <sl-icon-button
                            name="trash"
                            label="Delete"
                            style="color: var(--sl-color-danger-600);"
                            @click=${() => (this.deleteTarget = item)}
                          ></sl-icon-button>
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            `}

      <sl-dialog
        label="Confirm Delete"
        ?open=${this.deleteTarget !== null}
        @sl-after-hide=${() => (this.deleteTarget = null)}
      >
        Are you sure you want to delete "${this.deleteTarget?.id}"?
        <sl-button
          slot="footer"
          variant="default"
          @click=${() => (this.deleteTarget = null)}
        >Cancel</sl-button>
        <sl-button
          slot="footer"
          variant="danger"
          @click=${this.handleDelete}
        >Delete</sl-button>
      </sl-dialog>
    `;
  }

  private renderFieldValue(value: unknown): unknown {
    if (typeof value === 'boolean') {
      return html`<sl-badge variant="${value ? 'success' : 'neutral'}">${value ? 'Yes' : 'No'}</sl-badge>`;
    }
    if (Array.isArray(value)) {
      return value.length + ' items';
    }
    return value ?? '';
  }

  private handleNew() {
    this.dispatchEvent(
      new CustomEvent('admin-action', { detail: { action: 'new' }, bubbles: true, composed: true }),
    );
  }

  private handleEdit(item: DocWithId) {
    this.dispatchEvent(
      new CustomEvent('admin-action', {
        detail: { action: 'edit', id: item.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleDelete() {
    if (!this.deleteTarget) return;
    try {
      await removeDocument(this.collectionPath, this.deleteTarget.id);
      this.deleteTarget = null;
      await this.loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }
}
