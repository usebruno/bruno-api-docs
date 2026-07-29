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

  // The response-pane action buttons live in the status bar and only render once a
  // response exists (and there is no request error). Each is an ActionIcon <button>
  // whose `title` becomes its accessible name.
  readonly actions = this.page.locator('.response-pane-actions-wrapper');
  readonly copyButton = this.actions.getByRole('button', { name: 'Copy Response' });
  readonly downloadButton = this.actions.getByRole('button', { name: 'Download Response' });
  readonly clearButton = this.actions.getByRole('button', { name: 'Clear Response' });
  readonly changeLayoutButton = this.actions.getByRole('button', { name: 'Change Layout' });

  // The empty state shown before a response (and after Clear).
  readonly emptyHint = this.page.getByText('Click Send to make a request');

  // Large Response Warning banner (shown when the response exceeds 10MB) and its controls.
  readonly largeResponseWarning = this.page.getByTestId('large-response-warning');
  readonly largeResponseView = this.page.getByTestId('large-response-view');
  readonly largeResponseCopy = this.page.getByTestId('large-response-copy');
  readonly largeResponseDownload = this.page.getByTestId('large-response-download');

  constructor(page: Page, root?: Locator) {
    super(page, root);
  }

  /**
   * Fulfil the `get users` request's real resolved URL (`{{host}}/api/users?…`,
   * host = http://localhost:8081 in the Local env) with a canned JSON body so a send
   * lands a response in the pane without any live network.
   */
  async mockUsersResponse(body: string): Promise<void> {
    await this.page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body
      })
    );
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
