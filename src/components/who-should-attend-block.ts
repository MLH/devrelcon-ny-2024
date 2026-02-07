import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { whoShouldAttendBlock } from '../utils/data';
import { ThemedElement } from './themed-element';

@customElement('who-should-attend-block')
export class WhoShouldAttendBlock extends ThemedElement {
  static override get styles() {
    return [
      ...super.styles,
      css`
        :host {
          display: block;
          background-color: var(--secondary-background-color);
        }

        .container {
          padding-top: 64px;
          padding-bottom: 64px;
        }

        .container-title {
          margin-bottom: 8px;
        }

        .segments-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-gap: 24px;
        }

        .segment-card {
          background-color: var(--default-background-color);
          border-radius: var(--border-radius);
          padding: 28px 24px;
          box-shadow: var(--box-shadow);
          transition:
            box-shadow var(--animation),
            transform var(--animation);
          border-top: 3px solid var(--default-primary-color);
        }

        .segment-card:hover {
          box-shadow: var(--box-shadow-primary-color-hover);
          transform: translateY(-2px);
        }

        .segment-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--dark-primary-color);
          margin: 0 0 12px;
          line-height: 1.3;
        }

        .segment-description {
          font-size: 15px;
          line-height: 1.6;
          color: var(--primary-text-color);
          margin: 0;
        }

        @media (min-width: 640px) {
          .segments-grid {
            grid-template-columns: repeat(2, 1fr);
          }

        }

        @media (min-width: 960px) {
          .segments-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `,
    ];
  }

  override render() {
    return html`
      <div class="container">
        <h1 class="container-title">${whoShouldAttendBlock.title}</h1>
        <div class="segments-grid">
          ${whoShouldAttendBlock.segments.map(
            (segment) => html`
              <div class="segment-card">
                <h3 class="segment-title">${segment.title}</h3>
                <p class="segment-description">${segment.description}</p>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'who-should-attend-block': WhoShouldAttendBlock;
  }
}
