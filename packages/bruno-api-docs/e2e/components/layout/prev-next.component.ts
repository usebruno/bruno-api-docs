import type { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

/** Previous and Next, scoped to the pagination block so a stray link elsewhere is ignored. */
export class PrevNextComponent extends BaseComponent {
  constructor(page: Page) {
    super(page, page.getByTestId('prevnext'));
  }

  readonly previous = this.root.getByTestId('prev-link');
  readonly next = this.root.getByTestId('next-link');
}
