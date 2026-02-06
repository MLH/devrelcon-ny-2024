import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

export interface RepeaterField {
  name: string;
  label: string;
  placeholder?: string;
}

@customElement('admin-repeater')
export class AdminRepeater extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Array }) fields: RepeaterField[] = [];
  @property({ type: Array }) value: Record<string, string>[] = [];

  static override styles = css`
    :host {
      display: block;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--sl-color-neutral-700);
    }

    .row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .row sl-input {
      flex: 1;
    }

    .add-btn {
      margin-top: 4px;
    }
  `;

  override render() {
    return html`
      <label>${this.label}</label>
      ${(this.value || []).map(
        (item, index) => html`
          <div class="row">
            ${this.fields.map(
              (field) => html`
                <sl-input
                  size="small"
                  placeholder="${field.placeholder || field.label}"
                  value="${item[field.name] || ''}"
                  @sl-change=${(e: Event) => this.updateField(index, field.name, (e.target as HTMLInputElement).value)}
                ></sl-input>
              `,
            )}
            <sl-icon-button
              name="x-lg"
              label="Remove"
              @click=${() => this.removeRow(index)}
            ></sl-icon-button>
          </div>
        `,
      )}
      <sl-button class="add-btn" size="small" @click=${this.addRow}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add ${this.label}
      </sl-button>
    `;
  }

  private updateField(index: number, field: string, value: string) {
    const updated = [...this.value];
    updated[index] = { ...updated[index], [field]: value };
    this.value = updated;
    this.emitChange();
  }

  private addRow() {
    const empty: Record<string, string> = {};
    this.fields.forEach((f) => (empty[f.name] = ''));
    this.value = [...(this.value || []), empty];
    this.emitChange();
  }

  private removeRow(index: number) {
    this.value = this.value.filter((_, i) => i !== index);
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
