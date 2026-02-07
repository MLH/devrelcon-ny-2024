import { css, html, svg, SVGTemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { whyAttendBlock } from '../utils/data';
import { ThemedElement } from './themed-element';

/* eslint-disable max-len */
const iconPaths: Record<string, string[]> = {
  mic: [
    'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z',
    'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
  ],
  rocket: [
    'M9.19 6.35c-2.04 2.29-3.44 5.58-3.57 5.89L2 10.69l4.05-4.05c.47-.47 1.15-.68 1.81-.55l1.33.26z',
    'M11.17 17.01c2.29-2.04 5.58-3.44 5.89-3.57L15.51 10l-4.05 4.05c-.47.47-.68 1.15-.55 1.81l.26 1.15z',
    'M19.78 4.22c-.17-.17-3.55-1.38-7.87 2.93-1.86 1.86-3.06 4.05-3.65 5.61l2.98 2.98c1.56-.59 3.75-1.79 5.61-3.65 4.31-4.32 3.1-7.7 2.93-7.87z',
    'M14.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    'M3.21 17.35c-1 1-1.25 3.7-1.25 3.7s2.7-.25 3.7-1.25c.56-.56.56-1.47-.02-2.01-.53-.57-1.42-.53-2.43-.44z',
  ],
  people: [
    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3z',
    'M8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z',
    'M8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z',
    'M16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  ],
  crossfunctional: [
    'M15 3H9v2h6V3z',
    'M13 16h2V8h-2v8z',
    'M21.03 6.39l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0012 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61z',
    'M12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  ],
};
/* eslint-enable max-len */

function renderIcon(key: string): SVGTemplateResult {
  const paths = iconPaths[key] ?? iconPaths['mic'] ?? [];
  return svg`${paths.map((d) => svg`<path d=${d}/>`)}`;
}

@customElement('why-attend-block')
export class WhyAttendBlock extends ThemedElement {
  static override get styles() {
    return [
      ...super.styles,
      css`
        :host {
          display: block;
          background-color: var(--default-background-color);
        }

        .container {
          padding-top: 64px;
          padding-bottom: 64px;
        }

        .container-title {
          margin-bottom: 8px;
        }

        .props-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-gap: 32px;
        }

        .prop-item {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        .prop-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--dark-primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .prop-icon svg {
          width: 24px;
          height: 24px;
          fill: var(--text-primary-color);
        }

        .prop-content {
          flex: 1;
        }

        .prop-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--dark-primary-color);
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .prop-description {
          font-size: 15px;
          line-height: 1.7;
          color: var(--secondary-text-color);
          margin: 0;
        }

        @media (min-width: 640px) {
          .props-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-gap: 40px 48px;
          }
        }

        @media (min-width: 960px) {
          .props-grid {
            grid-gap: 48px 64px;
          }

          .prop-title {
            font-size: 20px;
          }

          .prop-description {
            font-size: 16px;
          }
        }
      `,
    ];
  }

  override render() {
    return html`
      <div class="container">
        <h1 class="container-title">${whyAttendBlock.title}</h1>
        <div class="props-grid">
          ${whyAttendBlock.valueProps.map(
            (prop) => html`
              <div class="prop-item">
                <div class="prop-icon">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    ${renderIcon(prop.icon)}
                  </svg>
                </div>
                <div class="prop-content">
                  <h3 class="prop-title">${prop.title}</h3>
                  <p class="prop-description">${prop.description}</p>
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'why-attend-block': WhyAttendBlock;
  }
}
