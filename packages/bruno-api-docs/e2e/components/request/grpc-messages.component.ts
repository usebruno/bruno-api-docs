import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class GrpcMessagesComponent extends BaseComponent {
  readonly showToggle: Locator;

  constructor(
    page: Page,
    private readonly base = 'grpc-messages'
  ) {
    super(page, page.getByTestId(base));
    this.showToggle = page.getByTestId(`${base}-show-toggle`);
  }

  card(index: number): Locator {
    return this.page.getByTestId(`${this.base}-card-${index}`);
  }

  toggle(index: number): Locator {
    return this.page.getByTestId(`${this.base}-card-${index}-toggle`);
  }

  code(index: number): Locator {
    return this.page.getByTestId(`${this.base}-card-${index}-code`);
  }

  async expand(index: number): Promise<void> {
    await this.toggle(index).click();
  }

  async showMore(): Promise<void> {
    await this.showToggle.click();
  }
}
