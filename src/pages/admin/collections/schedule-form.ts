import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchDocument, saveDocument, fetchCollection, DocWithId } from '../admin-firestore.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

interface Track {
  title: string;
}

interface TimeslotSession {
  items: string[];
  extend?: number;
}

interface Timeslot {
  startTime: string;
  endTime: string;
  sessions: TimeslotSession[];
}

interface ScheduleDay {
  date: string;
  dateReadable: string;
  tracks: Track[];
  timeslots: Timeslot[];
}

@customElement('schedule-form')
export class ScheduleForm extends LitElement {
  @property({ type: String }) editId = '';

  @state() private day: ScheduleDay = {
    date: '',
    dateReadable: '',
    tracks: [{ title: '' }],
    timeslots: [],
  };
  @state() private sessions: DocWithId[] = [];
  @state() private assignedSessionIds: Set<string> = new Set();
  @state() private loading = true;
  @state() private saving = false;
  @state() private message: { type: 'success' | 'danger'; text: string } | null = null;
  @state() private isNew = false;
  @state() private docId = '';

  static override styles = css`
    :host {
      display: block;
      max-width: 900px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    h1, h2 {
      margin: 0;
    }

    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin: 24px 0 12px; }

    .day-fields {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .day-fields sl-input {
      flex: 1;
    }

    .track-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .track-row sl-input {
      flex: 1;
    }

    .timeslot-card {
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--sl-color-neutral-200);
      border-radius: 8px;
    }

    .timeslot-header {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .timeslot-header sl-input {
      width: 140px;
    }

    .track-session {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 8px;
    }

    .track-session sl-select {
      flex: 1;
    }

    .track-session sl-input {
      width: 100px;
    }

    .track-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--sl-color-neutral-500);
      margin-bottom: 4px;
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

  private async loadData() {
    this.loading = true;

    // Load all sessions for the dropdowns
    try {
      this.sessions = await fetchCollection('sessions', 'title');
    } catch {
      this.sessions = [];
    }

    if (this.editId) {
      const doc = await fetchDocument('schedule', this.editId);
      if (doc) {
        this.day = doc as unknown as ScheduleDay;
        this.docId = this.editId;
      }
    } else {
      this.isNew = true;
    }

    this.updateAssignedSessions();
    this.loading = false;
  }

  private updateAssignedSessions() {
    const ids = new Set<string>();
    this.day.timeslots.forEach((ts) => {
      ts.sessions.forEach((s) => {
        s.items.forEach((id) => {
          if (id) ids.add(id);
        });
      });
    });
    this.assignedSessionIds = ids;
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
        <h1>${this.isNew ? 'New' : 'Edit'} Schedule Day</h1>
      </div>

      ${this.message
        ? html`
            <sl-alert variant="${this.message.type}" open closable @sl-after-hide=${() => (this.message = null)}>
              ${this.message.text}
            </sl-alert>
          `
        : nothing}

      <!-- Day Info -->
      <h2>Day Info</h2>
      <div class="day-fields">
        <sl-input
          label="Date (Document ID)"
          type="date"
          value="${this.docId || this.day.date}"
          ?disabled=${!this.isNew}
          @sl-change=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            this.docId = val;
            this.day = { ...this.day, date: val };
          }}
        ></sl-input>
        <sl-input
          label="Readable Date"
          value="${this.day.dateReadable}"
          placeholder="e.g. July 17"
          @sl-change=${(e: Event) => (this.day = { ...this.day, dateReadable: (e.target as HTMLInputElement).value })}
        ></sl-input>
      </div>

      <!-- Tracks -->
      <h2>Tracks</h2>
      ${this.day.tracks.map(
        (track, i) => html`
          <div class="track-row">
            <sl-input
              value="${track.title}"
              placeholder="Track name (e.g. Main Stage)"
              @sl-change=${(e: Event) => this.updateTrack(i, (e.target as HTMLInputElement).value)}
            ></sl-input>
            ${this.day.tracks.length > 1
              ? html`<sl-icon-button name="x-lg" @click=${() => this.removeTrack(i)}></sl-icon-button>`
              : nothing}
          </div>
        `,
      )}
      <sl-button size="small" @click=${this.addTrack}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Track
      </sl-button>

      <!-- Timeslots -->
      <h2>Timeslots</h2>
      ${this.day.timeslots.map((ts, tsIndex) => this.renderTimeslot(ts, tsIndex))}
      <sl-button size="small" @click=${this.addTimeslot}>
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Timeslot
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

  private renderTimeslot(ts: Timeslot, tsIndex: number) {
    return html`
      <div class="timeslot-card">
        <div class="timeslot-header">
          <sl-input
            label="Start Time"
            type="time"
            value="${ts.startTime}"
            @sl-change=${(e: Event) => this.updateTimeslotTime(tsIndex, 'startTime', (e.target as HTMLInputElement).value)}
          ></sl-input>
          <sl-input
            label="End Time"
            type="time"
            value="${ts.endTime}"
            @sl-change=${(e: Event) => this.updateTimeslotTime(tsIndex, 'endTime', (e.target as HTMLInputElement).value)}
          ></sl-input>
          <sl-icon-button
            name="trash"
            label="Remove timeslot"
            style="color: var(--sl-color-danger-600);"
            @click=${() => this.removeTimeslot(tsIndex)}
          ></sl-icon-button>
        </div>

        ${this.day.tracks.map((track, trackIndex) => {
          const session = ts.sessions[trackIndex] || { items: [''], extend: undefined };
          const sessionId = session.items[0] || '';
          return html`
            <div class="track-label">${track.title || `Track ${trackIndex + 1}`}</div>
            <div class="track-session">
              <sl-select
                placeholder="Select session..."
                value="${sessionId}"
                clearable
                hoist
                @sl-change=${(e: Event) => this.updateTimeslotSession(tsIndex, trackIndex, (e.target as any).value)}
              >
                ${this.sessions.map(
                  (s) => html`
                    <sl-option value="${s.id}">
                      ${s['title']}
                      ${this.assignedSessionIds.has(s.id) && s.id !== sessionId ? ' (assigned)' : ''}
                    </sl-option>
                  `,
                )}
              </sl-select>
              <sl-input
                type="number"
                label="Extend"
                value="${session.extend ?? ''}"
                placeholder="1"
                @sl-change=${(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateTimeslotExtend(tsIndex, trackIndex, val ? Number(val) : undefined);
                }}
              ></sl-input>
            </div>
          `;
        })}
      </div>
    `;
  }

  // --- Track operations ---
  private updateTrack(index: number, title: string) {
    const tracks = [...this.day.tracks];
    tracks[index] = { title };
    this.day = { ...this.day, tracks };
  }

  private addTrack() {
    this.day = { ...this.day, tracks: [...this.day.tracks, { title: '' }] };
    // Add a session slot to each existing timeslot for the new track
    const timeslots = this.day.timeslots.map((ts) => ({
      ...ts,
      sessions: [...ts.sessions, { items: [''] }],
    }));
    this.day = { ...this.day, timeslots };
  }

  private removeTrack(index: number) {
    const tracks = this.day.tracks.filter((_, i) => i !== index);
    const timeslots = this.day.timeslots.map((ts) => ({
      ...ts,
      sessions: ts.sessions.filter((_, i) => i !== index),
    }));
    this.day = { ...this.day, tracks, timeslots };
  }

  // --- Timeslot operations ---
  private addTimeslot() {
    const sessions = this.day.tracks.map(() => ({ items: [''] }));
    this.day = {
      ...this.day,
      timeslots: [...this.day.timeslots, { startTime: '', endTime: '', sessions }],
    };
  }

  private removeTimeslot(index: number) {
    this.day = {
      ...this.day,
      timeslots: this.day.timeslots.filter((_, i) => i !== index),
    };
    this.updateAssignedSessions();
  }

  private updateTimeslotTime(tsIndex: number, field: 'startTime' | 'endTime', value: string) {
    const timeslots = [...this.day.timeslots];
    const existing = timeslots[tsIndex];
    if (!existing) return;
    timeslots[tsIndex] = { ...existing, [field]: value };
    this.day = { ...this.day, timeslots };
  }

  private updateTimeslotSession(tsIndex: number, trackIndex: number, sessionId: string) {
    const timeslots = [...this.day.timeslots];
    const existing = timeslots[tsIndex];
    if (!existing) return;
    const sessions = [...existing.sessions];
    const existingSession = sessions[trackIndex];
    sessions[trackIndex] = { ...existingSession, items: sessionId ? [sessionId] : [''] };
    timeslots[tsIndex] = { ...existing, sessions };
    this.day = { ...this.day, timeslots };
    this.updateAssignedSessions();
  }

  private updateTimeslotExtend(tsIndex: number, trackIndex: number, extend: number | undefined) {
    const timeslots = [...this.day.timeslots];
    const existing = timeslots[tsIndex];
    if (!existing) return;
    const sessions = [...existing.sessions];
    const existingSession = sessions[trackIndex];
    if (!existingSession) return;
    const updated: TimeslotSession = { items: existingSession.items };
    if (extend !== undefined) updated.extend = extend;
    sessions[trackIndex] = updated;
    timeslots[tsIndex] = { ...existing, sessions };
    this.day = { ...this.day, timeslots };
  }

  // --- Save ---
  private async handleSave() {
    if (!this.docId) {
      this.message = { type: 'danger', text: 'Date is required.' };
      return;
    }

    // Sort timeslots by start time before saving
    const sortedTimeslots = [...this.day.timeslots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    // Clean up sessions: remove empty items, remove undefined extend
    const cleanTimeslots = sortedTimeslots.map((ts) => ({
      ...ts,
      sessions: ts.sessions.map((s) => {
        const clean: TimeslotSession = { items: s.items.filter((id) => id !== '') };
        if (s.extend && s.extend > 1) clean.extend = s.extend;
        return clean;
      }),
    }));

    this.saving = true;
    try {
      await saveDocument('schedule', this.docId, {
        date: this.day.date || this.docId,
        dateReadable: this.day.dateReadable,
        tracks: this.day.tracks,
        timeslots: cleanTimeslots,
      });
      this.message = { type: 'success', text: 'Schedule day saved!' };
      if (this.isNew) {
        this.isNew = false;
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
