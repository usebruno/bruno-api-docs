import { expect, type Locator, type Page } from '@playwright/test';
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
  // The leading icon in the selector trigger (the eye when preview is on, else the format's icon).
  readonly formatSelectorIcon = this.page.getByTestId('response-format-selector-trigger-icon');

  // The response actions live in the tab bar's right slot and only render once a response exists
  // (and there is no request error). They are responsive: collapsed into a kebab menu when the slot
  // is narrow (the default e2e viewport), shown as inline buttons when wide.
  readonly actions = this.page.getByTestId('response-pane-actions-wrapper');
  readonly actionsMenuTrigger = this.page.getByTestId('response-actions-menu');
  readonly inlineButtons = this.actions.getByTestId('actions-buttons');
  // Menu items, visible once the kebab is opened.
  readonly copyMenuItem = this.page.getByTestId('response-actions-menu-copy');
  readonly downloadMenuItem = this.page.getByTestId('response-actions-menu-download');
  readonly clearMenuItem = this.page.getByTestId('response-actions-menu-clear');
  readonly layoutMenuItem = this.page.getByTestId('response-actions-menu-layout');

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

  /** Open the collapsed response-actions kebab menu and wait for its items to render. */
  async openActionsMenu(): Promise<void> {
    await this.actionsMenuTrigger.click();
    await this.copyMenuItem.waitFor({ state: 'visible' });
  }

  /**
   * Switch the response tab bar to a tab by id, regardless of whether the responsive tab bar renders
   * it inline or collapses it into the "⋯ more" overflow menu at the current width. Waits for the
   * switch to settle (the target becomes the selected tab) so a following switch never races the
   * layout mid-transition.
   */
  async switchToTab(id: string): Promise<void> {
    const inlineTab = this.page.getByTestId(`response-tabs-tab-${id}`);
    if (await inlineTab.isVisible()) {
      await inlineTab.click();
    } else {
      await this.page.getByTestId('response-tabs-more').click();
      await this.page.getByTestId(`response-tabs-more-${id}`).click();
    }
    // The active tab is always promoted to an inline, selected button — wait for that before returning.
    await expect(inlineTab).toHaveAttribute('aria-selected', 'true');
  }

  readonly inlineCopyButton = this.inlineButtons.getByRole('button', { name: 'Copy Response' });
  readonly inlineDownloadButton = this.inlineButtons.getByRole('button', { name: 'Download Response' });
  readonly inlineClearButton = this.inlineButtons.getByRole('button', { name: 'Clear Response' });
  readonly inlineChangeLayoutButton = this.inlineButtons.getByRole('button', { name: 'Change Layout' });

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
