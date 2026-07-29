import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import type { ResponseBodyFormat } from '../../../src/utils/response';

/**
 * The response pane's format controls and body editor. The format selector is a MenuDropdown
 * whose trigger carries `response-format-selector`; each option's id is derived as
 * `response-format-selector-<format>` (see MenuDropdown's per-item test id).
 */
export class ResponsePaneComponent extends BaseComponent {
  readonly bodyEditor = new CodeEditorComponent(this.page, 'response-body-editor');
  readonly sendButton = this.page.getByTestId('query-bar-send');
  readonly formatSelector = this.page.getByTestId('response-format-selector');

  constructor(page: Page, root?: Locator) {
    super(page, root);
  }

  readonly previewToggle = this.page.getByRole('switch', { name: 'Toggle preview' });

  formatOption(format: ResponseBodyFormat): Locator {
    return this.page.getByTestId(`response-format-selector-${format}`);
  }

  async send(): Promise<void> {
    await this.sendButton.click();
  }

  async openFormatSelector(): Promise<void> {
    await this.formatSelector.click();
  }

  async selectFormat(format: ResponseBodyFormat): Promise<void> {
    await this.formatSelector.click();
    await this.formatOption(format).click();
  }

  /** Flip the preview toggle in the (already open) format dropdown. */
  async togglePreview(): Promise<void> {
    await this.previewToggle.click();
  }

  async isPreviewOn(): Promise<boolean> {
    return (await this.previewToggle.getAttribute('aria-checked')) === 'true';
  }

  /**
   * The visible text of the response body editor (Monaco renders lines under `.view-lines`).
   * Monaco's `innerText` emits indentation and inter-token spacing as non-breaking spaces, so
   * normalise them back to regular spaces for stable assertions.
   */
  async bodyText(): Promise<string> {
    return (await this.bodyEditor.root.locator('.view-lines').innerText())
      .replace(/\u00A0/g, ' ')
      .trim();
  }
}
