import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class RequestUrlBarComponent extends BaseComponent {
  constructor(page: Page, scope: Page | Locator = page) {
    super(page, scope.getByTestId('request-url-bar'));
  }

  readonly method = this.root.getByTestId('request-method');
  readonly url = this.root.getByTestId('request-url');
  readonly tryButton = this.root.getByTestId('request-try-button');
}
