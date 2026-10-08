import type { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class OpenInBrunoModalComponent extends BaseComponent {
  constructor(page: Page) {
    super(page, page.getByTestId('open-in-bruno-modal'));
  }

  readonly title = this.root.getByTestId('open-in-bruno-modal-title');
  readonly downloadCollection = this.root.getByTestId('open-in-bruno-modal-download');
  readonly step1 = this.root.getByTestId('open-in-bruno-modal-step-1');
  readonly step2 = this.root.getByTestId('open-in-bruno-modal-step-2');
  readonly step3 = this.root.getByTestId('open-in-bruno-modal-step-3');
  readonly filename = this.root.getByTestId('open-in-bruno-modal-filename');
  readonly downloadBruno = this.root.getByTestId('open-in-bruno-modal-download-bruno');
  readonly closeButton = this.root.getByTestId('open-in-bruno-modal-close');
  readonly backdrop = this.page.getByTestId('open-in-bruno-modal-backdrop');

  async clickBackdrop(): Promise<void> {
    await this.backdrop.click({ position: { x: 8, y: 8 } });
  }
}
