import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class MethodSelectorComponent extends BaseComponent {
  // MenuDropdown stamps its own `testId` onto the trigger it is handed.
  readonly trigger = this.page.getByTestId('method-select');
  readonly customInput = this.page.getByTestId('method-select-custom-input');
  readonly addCustom = this.page.getByTestId('method-select-add-custom');
  // The menu is portaled to <body> by Tippy, so its rows live outside the query bar.
  readonly options = this.page.locator('[data-tippy-root] [data-item-id]');
  readonly selectedOption = this.page.locator('[data-tippy-root] [aria-selected="true"]');

  option(method: string): Locator {
    return this.page.getByTestId(`method-select-${method.toLowerCase()}`);
  }

  async open(): Promise<void> {
    await this.trigger.click();
    await this.addCustom.waitFor({ state: 'visible' });
  }

  async optionIds(): Promise<(string | null)[]> {
    await this.open();
    return this.options.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-item-id')));
  }

  async select(method: string): Promise<void> {
    await this.open();
    await this.option(method).click();
  }

  /** Open the custom-method field and type into it, without committing. */
  async startCustom(value: string): Promise<void> {
    await this.open();
    await this.addCustom.click();
    await this.customInput.waitFor({ state: 'visible' });
    await this.customInput.fill(value);
  }

  async enterCustom(value: string): Promise<void> {
    await this.startCustom(value);
    await this.customInput.press('Enter');
  }
}
