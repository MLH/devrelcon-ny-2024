import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../../firebase.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

const storage = getStorage(firebaseApp);

@customElement('admin-image-upload')
export class AdminImageUpload extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) collection = '';
  @property({ type: String }) label = 'Image';

  @state() private uploading = false;
  @state() private progress = 0;

  static override styles = css`
    :host {
      display: block;
    }

    .upload-area {
      border: 2px dashed var(--sl-color-neutral-300);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .upload-area:hover {
      border-color: var(--sl-color-primary-500);
    }

    .preview {
      margin-top: 8px;
    }

    .preview img {
      max-width: 200px;
      max-height: 150px;
      border-radius: 4px;
      object-fit: cover;
    }

    .preview-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--sl-color-neutral-700);
    }

    input[type="file"] {
      display: none;
    }
  `;

  override render() {
    return html`
      <label>${this.label}</label>
      ${this.value
        ? html`
            <div class="preview-row">
              <div class="preview">
                <img src="${this.value}" alt="Preview" />
              </div>
              <sl-button size="small" @click=${this.pickFile}>Replace</sl-button>
            </div>
          `
        : html`
            <div class="upload-area" @click=${this.pickFile}>
              <sl-icon name="cloud-upload" style="font-size: 24px;"></sl-icon>
              <div>Click to upload</div>
            </div>
          `}
      ${this.uploading
        ? html`<sl-progress-bar value="${this.progress}" style="margin-top: 8px;"></sl-progress-bar>`
        : ''}
      <input type="file" accept="image/*" @change=${this.handleFile} />
    `;
  }

  private pickFile() {
    this.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!.click();
  }

  private handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `admin-uploads/${this.collection}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    this.uploading = true;
    this.progress = 0;

    task.on(
      'state_changed',
      (snapshot) => {
        this.progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        console.error('Upload failed:', error);
        this.uploading = false;
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        this.value = url;
        this.uploading = false;
        this.dispatchEvent(
          new CustomEvent('image-uploaded', {
            detail: { url },
            bubbles: true,
            composed: true,
          }),
        );
      },
    );

    // Reset file input so the same file can be re-selected
    input.value = '';
  }
}
