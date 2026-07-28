import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class EnvEditorComponent extends BaseComponent {
  // Each card and its inputs carry a per-card index (`-card-0`, `-name-input-0`, …) so an individual
  // card is uniquely addressable; the regexes collect every card's field, ordered by index in the DOM.
  readonly cards = this.page.getByTestId('env-var-cards');
  readonly cardItems = this.cards.getByTestId(/^env-var-cards-card-\d+$/);
  readonly nameInputs = this.cards.getByTestId(/^env-var-cards-name-input-\d+$/);
  readonly valueInputs = this.cards.getByTestId(/^env-var-cards-value-input-\d+$/);
  readonly descriptionInputs = this.cards.getByTestId(/^env-var-cards-description-input-\d+$/);

  async selectEnvironment(name: string): Promise<void> {
    await this.page.getByTestId(`env-pill-${name}`).click();
  }

  /** The card at a given index, addressed directly by its unique test id. */
  card(index: number): Locator {
    return this.cards.getByTestId(`env-var-cards-card-${index}`);
  }

  /** The per-variable enable/disable checkbox, addressed by the variable name via its aria-label. */
  enableToggle(name: string): Locator {
    return this.cards.getByRole('checkbox', { name: `Enable ${name}` });
  }

  /** The card that owns the named variable, matched via its enable checkbox. */
  cardFor(name: string): Locator {
    return this.cardItems.filter({ has: this.page.getByRole('checkbox', { name: `Enable ${name}` }) });
  }
}
