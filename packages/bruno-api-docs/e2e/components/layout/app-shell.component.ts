import type { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

/** The app shell. Content is the `<main>` beside the docs sidebar. */
export class AppShellComponent extends BaseComponent {
  constructor(page: Page) {
    super(page, page.getByTestId('app-shell'));
  }

  readonly content = this.root.getByTestId('app-shell-content');
}
