import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class EnvEditorComponent extends BaseComponent {
  readonly cards = this.page.getByTestId('env-var-cards');
  readonly cardItems = this.cards.getByTestId('env-var-cards-card');
  readonly nameInputs = this.cards.getByTestId('env-var-cards-name-input');
  readonly valueInputs = this.cards.getByTestId('env-var-cards-value-input');
  readonly descriptionInputs = this.cards.getByTestId('env-var-cards-description-input');

  async selectEnvironment(name: string): Promise<void> {
    await this.page.getByTestId(`env-pill-${name}`).click();
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
