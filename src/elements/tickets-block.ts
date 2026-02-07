import { Pending, Success } from '@abraham/remotedata';
import { computed, customElement, property } from '@polymer/decorators';
import '@polymer/paper-button';
import { html, PolymerElement } from '@polymer/polymer';
import { Ticket } from '../models/ticket';
import { RootState } from '../store';
import { ReduxMixin } from '../store/mixin';
import { initialTicketsState } from '../store/tickets/state';
import { buyTicket, contentLoaders, ticketsBlock, scholarshipTicket } from '../utils/data';
import '../utils/icons';
import './content-loader';
import './shared-styles';

@customElement('tickets-block')
export class TicketsBlock extends ReduxMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="shared-styles flex flex-alignment positioning">
        :host {
          display: block;
        }

        .tickets-wrapper {
          text-align: center;
        }

        .tickets {
          margin: 32px 0 24px;
        }

        .ticket-item {
          margin: 16px 8px;
          width: 100%;
          text-align: center;
          color: var(--primary-text-color);
          background-color: var(--default-background-color);
        }

        .ticket-item[in-demand] {
          transform: scale(1.05);
          box-shadow: var(--box-shadow-primary-color);
          border-top: 2px solid var(--default-primary-color);
          z-index: 1;
        }

        .ticket-item[in-demand]:hover {
          box-shadow: var(--box-shadow-primary-color-hover);
        }

        .ticket-item[sold-out] {
          opacity: 0.5;
          filter: grayscale(1);
          cursor: not-allowed;
        }

        .ticket-item[sold-out]:hover {
          box-shadow:
            0 0 2px 0 rgba(0, 0, 0, 0.07),
            0 2px 2px 0 rgba(0, 0, 0, 0.15);
        }

        .header {
          padding: 24px 0 0;
          font-size: 16px;
        }

        .content {
          padding: 0 24px;
        }

        .type-description {
          font-size: 12px;
          color: var(--secondary-text-color);
        }

        .ticket-price-wrapper {
          margin: 24px 0;
          white-space: nowrap;
        }

        .price {
          color: var(--default-primary-color);
          font-size: 40px;
        }

        .discount {
          font-size: 14px;
          color: var(--accent-color);
        }

        .sold-out {
          display: none;
          font-size: 14px;
          text-transform: uppercase;
          height: 32px;
          color: var(--secondary-text-color);
        }

        .additional-info {
          margin: 16px auto 0;
          max-width: 640px;
          font-size: 14px;
          color: var(--secondary-text-color);
          line-height: 1.5;
        }

        .additional-info a {
          color: var(--default-primary-color);
          text-decoration: underline;
        }

        .actions {
          padding: 24px;
          position: relative;
        }

        .tickets-placeholder {
          display: grid;
          width: 100%;
        }

        paper-button[disabled] {
          background-color: var(--primary-color-transparent);
          font-size: 12px;
        }

        /* Urgency indicator */
        .urgency-banner {
          margin: 0 auto 8px;
          padding: 8px 16px;
          background-color: var(--primary-color-transparent);
          border-left: 3px solid var(--default-primary-color);
          border-radius: var(--border-radius);
          font-size: 14px;
          color: var(--primary-text-color);
          font-weight: 500;
          display: inline-block;
        }

        /* Feature comparison table */
        .feature-comparison {
          margin: 32px auto 0;
          max-width: 720px;
          text-align: left;
        }

        .feature-comparison h3 {
          font-size: 20px;
          font-weight: 500;
          margin-bottom: 16px;
          text-align: center;
          color: var(--primary-text-color);
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .comparison-table th,
        .comparison-table td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--divider-color);
          text-align: center;
        }

        .comparison-table th {
          font-weight: 600;
          color: var(--primary-text-color);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background-color: var(--secondary-background-color);
        }

        .comparison-table th:first-child,
        .comparison-table td:first-child {
          text-align: left;
          font-weight: 500;
        }

        .comparison-table td:first-child {
          color: var(--primary-text-color);
        }

        .comparison-table .check {
          color: var(--default-primary-color);
          font-size: 18px;
          font-weight: 700;
        }

        .comparison-table .supporter-col {
          background-color: var(--primary-color-transparent);
        }

        .comparison-table .exclusive-row td {
          font-weight: 600;
        }

        /* Convince your boss + group discount */
        .ticket-ctas {
          margin: 24px auto 0;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .convince-boss {
          font-size: 15px;
          color: var(--primary-text-color);
        }

        .convince-boss a {
          color: var(--default-primary-color);
          font-weight: 500;
          text-decoration: none;
        }

        .convince-boss a:hover {
          text-decoration: underline;
        }

        .convince-boss a::after {
          content: ' \\2192';
        }

        .group-discount {
          font-size: 14px;
          color: var(--secondary-text-color);
        }

        .group-discount a {
          color: var(--default-primary-color);
          text-decoration: underline;
        }

        @media (min-width: 640px) {
          .tickets-placeholder {
            grid-template-columns: repeat(auto-fill, 200px);
          }

          .ticket-item {
            max-width: 200px;
          }

          .ticket-item[in-demand] {
            transform: scale(1.15);
          }
        }

        /* Mobile responsive comparison table */
        @media (max-width: 480px) {
          .comparison-table {
            font-size: 12px;
          }

          .comparison-table th,
          .comparison-table td {
            padding: 8px 4px;
          }

          .comparison-table th {
            font-size: 10px;
          }

          .feature-comparison {
            margin: 24px 0 0;
          }
        }
      </style>

      <div class="tickets-wrapper container">
        <h1 class="container-title">[[ticketsBlock.title]]</h1>

        <div class="urgency-banner" hidden$="[[!ticketsBlock.urgencyMessage]]">
          [[ticketsBlock.urgencyMessage]]
        </div>

        <content-loader
          class="tickets-placeholder"
          card-padding="24px"
          card-height="216px"
          border-radius="var(--border-radius)"
          title-top-position="32px"
          title-height="42px"
          title-width="70%"
          load-from="-70%"
          load-to="130%"
          animation-time="1s"
          items-count="[[contentLoaders.itemsCount]]"
          hidden$="[[!pending]]"
        >
        </content-loader>

        <div class="tickets" layout horizontal wrap center-justified>
          <template is="dom-if" if="[[tickets.error]]"> Error loading tickets </template>

          <template is="dom-repeat" items="[[tickets.data]]" as="ticket">
            <a
              class="ticket-item card"
              href$="[[ticket.url]]"
              target="_blank"
              rel="noopener noreferrer"
              sold-out$="[[ticket.soldOut]]"
              in-demand$="[[ticket.inDemand]]"
              on-click="onTicketTap"
              layout
              vertical
            >
              <div class="header">
                <h4>[[ticket.name]]</h4>
              </div>
              <div class="content" layout vertical flex-auto>
                <div class="ticket-price-wrapper">
                  <div class="price">[[ticket.currency]][[ticket.price]]</div>
                  <div class="discount">[[getDiscount(ticket)]]</div>
                </div>
                <div class="type-description" layout vertical flex-auto center-justified>
                  <div class="ticket-dates" hidden$="[[!ticket.starts]]">
                    [[ticket.starts]] - [[ticket.ends]]
                  </div>
                  <div class="ticket-info">[[ticket.info]]</div>
                </div>
              </div>
              <div class="actions">
                <div class="sold-out" block$="[[ticket.soldOut]]">[[ticketsBlock.soldOut]]</div>
                <paper-button
                  primary
                  hidden$="[[ticket.soldOut]]"
                  disabled$="[[!ticket.available]]"
                >
                  [[getButtonText(ticket.available,ticket.scholarship)]]
                </paper-button>
              </div>
            </a>
          </template>
        </div>

        <div class="feature-comparison" hidden$="[[pending]]">
          <h3>[[ticketsBlock.featureComparison.title]]</h3>
          <table class="comparison-table">
            <thead>
              <tr>
                <th></th>
                <th>[[ticketsBlock.featureComparison.tierLabels.scholarship]]</th>
                <th>[[ticketsBlock.featureComparison.tierLabels.earlybird]]</th>
                <th>[[ticketsBlock.featureComparison.tierLabels.regular]]</th>
                <th class="supporter-col">[[ticketsBlock.featureComparison.tierLabels.supporter]]</th>
              </tr>
            </thead>
            <tbody>
              <template is="dom-repeat" items="[[ticketsBlock.featureComparison.features]]" as="feature">
                <tr class$="[[getExclusiveRowClass(feature)]]">
                  <td>[[feature.name]]</td>
                  <td><span class="check" hidden$="[[!hasTier(feature, 'scholarship')]]">&#10003;</span></td>
                  <td><span class="check" hidden$="[[!hasTier(feature, 'earlybird')]]">&#10003;</span></td>
                  <td><span class="check" hidden$="[[!hasTier(feature, 'regular')]]">&#10003;</span></td>
                  <td class="supporter-col">
                    <span class="check" hidden$="[[!hasTier(feature, 'supporter')]]">&#10003;</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="ticket-ctas">
          <div class="convince-boss">
            [[ticketsBlock.convinceBoss]]
            <a href$="[[ticketsBlock.convinceBossLink]]">[[ticketsBlock.convinceBossLabel]]</a>
          </div>
          <div class="group-discount">
            [[ticketsBlock.groupDiscountPrefix]]
            <a href="mailto:devrelcon@mlh.io">[[ticketsBlock.groupDiscountEmail]]</a>
            [[ticketsBlock.groupDiscountSuffix]]
          </div>
        </div>

        <div class="additional-info">
          <div>*[[ticketsBlock.ticketsDetails]]</div>
          <div>
            [[ticketsBlock.neighborhoodLinkPrefix]]
            <a href="/neighborhood">[[ticketsBlock.neighborhoodLinkLabel]]</a>
            [[ticketsBlock.neighborhoodLinkSuffix]]
          </div>
        </div>
      </div>
    `;
  }

  private ticketsBlock = ticketsBlock;
  private contentLoaders = contentLoaders.tickets;

  @property({ type: Object })
  tickets = initialTicketsState;

  override stateChanged(state: RootState) {
    this.tickets = state.tickets;
  }

  @computed('tickets')
  private get pending() {
    return this.tickets instanceof Pending;
  }

  private getDiscount(ticket: Ticket) {
    if (!(this.tickets instanceof Success)) {
      return '';
    }
    const primaryTicket = this.tickets.data.find((ticket) => ticket.primary);
    if (!primaryTicket) {
      return '';
    }
    const maxPrice = primaryTicket && primaryTicket.price;
    if (!ticket.regular || ticket.primary || ticket.soldOut || !maxPrice) {
      return '';
    }
    const discount = String(Math.round(100 - (ticket.price * 100) / maxPrice));
    return this.ticketsBlock.save.replace('${discount}', discount);
  }

  private onTicketTap(e: PointerEvent & { model: { ticket: Ticket } }) {
    if (e.model.ticket.soldOut || !e.model.ticket.available) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private getButtonText(available: boolean, scholarship: boolean) {
    return scholarship ? scholarshipTicket : (available ? buyTicket : this.ticketsBlock.notAvailableYet);
  }

  private hasTier(
    feature: { name: string; tiers: string[] },
    tier: string
  ): boolean {
    return feature.tiers.includes(tier);
  }

  private getExclusiveRowClass(feature: { name: string; tiers: string[] }): string {
    return feature.tiers.length === 1 ? 'exclusive-row' : '';
  }
}
