import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { testimonialsBlock } from '../utils/data';
import { ThemedElement } from './themed-element';

/* eslint-disable max-len */
const personIconPath =
  'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';
/* eslint-enable max-len */

@customElement('testimonials-block')
export class TestimonialsBlock extends ThemedElement {
  static override get styles() {
    return [
      ...super.styles,
      css`
        :host {
          display: block;
          background-color: var(--dark-primary-color);
          color: var(--text-primary-color);
        }

        .container {
          padding-top: 64px;
          padding-bottom: 64px;
        }

        .container-title {
          margin-bottom: 8px;
          color: var(--text-primary-color);
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-gap: 24px;
        }

        .testimonial-card {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: var(--border-radius);
          padding: 32px 28px;
          position: relative;
          transition:
            background-color var(--animation),
            transform var(--animation);
        }

        .testimonial-card:hover {
          background-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .quote-icon {
          font-size: 48px;
          line-height: 1;
          color: rgba(255, 255, 255, 0.25);
          font-family: Georgia, 'Times New Roman', serif;
          margin-bottom: 8px;
          user-select: none;
        }

        .testimonial-quote {
          font-size: 16px;
          line-height: 1.7;
          font-style: italic;
          margin: 0 0 20px;
          color: rgba(255, 255, 255, 0.92);
        }

        .testimonial-attribution {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .testimonial-photo {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          background-color: rgba(255, 255, 255, 0.15);
        }

        .testimonial-photo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex-shrink: 0;
          background-color: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .testimonial-photo-placeholder svg {
          width: 24px;
          height: 24px;
          fill: rgba(255, 255, 255, 0.4);
        }

        .testimonial-name {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary-color);
        }

        .testimonial-role {
          font-size: 13px;
          margin: 2px 0 0;
          color: rgba(255, 255, 255, 0.7);
        }

        @media (min-width: 640px) {
          .testimonials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 960px) {
          .testimonials-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .testimonial-quote {
            font-size: 15px;
          }
        }
      `,
    ];
  }

  override render() {
    return html`
      <div class="container">
        <h1 class="container-title">${testimonialsBlock.title}</h1>
        <div class="testimonials-grid">
          ${testimonialsBlock.testimonials.map(
            (testimonial) => html`
              <div class="testimonial-card">
                <div class="quote-icon" aria-hidden="true">&ldquo;</div>
                <p class="testimonial-quote">${testimonial.quote}</p>
                <div class="testimonial-attribution">
                  ${testimonial.photoUrl
                    ? html`<img
                        class="testimonial-photo"
                        src="${testimonial.photoUrl}"
                        alt="${testimonial.name}"
                        loading="lazy"
                      />`
                    : html`<div class="testimonial-photo-placeholder">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d=${personIconPath} />
                        </svg>
                      </div>`}
                  <div>
                    <p class="testimonial-name">${testimonial.name}</p>
                    <p class="testimonial-role">
                      ${testimonial.title}, ${testimonial.company}
                    </p>
                  </div>
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
    'testimonials-block': TestimonialsBlock;
  }
}
