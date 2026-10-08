import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class CodeSnippetComponent extends BaseComponent {
  readonly code: Locator;
  readonly copyButton: Locator;
  readonly expandButton: Locator;
  readonly iconTrigger: Locator;
  readonly modal: Locator;
  readonly modalCode: Locator;
  readonly modalCopyButton: Locator;
  readonly modalInterpolate: Locator;

  constructor(
    page: Page,
    private readonly base = 'request-code-snippet'
  ) {
    super(page, page.getByTestId(base));
    this.code = this.root.getByTestId(`${base}-code`);
    this.copyButton = this.root.getByTestId(`${base}-code-copy`);
    this.expandButton = this.root.getByTestId(`${base}-expand`);
    this.iconTrigger = this.root.getByTestId(`${base}-trigger`);
    this.modal = page.getByTestId(`${base}-modal`);
    this.modalCode = this.modal.getByTestId(`${base}-code`);
    this.modalCopyButton = this.modal.getByTestId(`${base}-copy`);
    this.modalInterpolate = this.modal.getByTestId(`${base}-interpolate-input`);
  }

  async languageIds(): Promise<string[]> {
    return this.tabIds(this.root);
  }

  async modalLanguageIds(): Promise<string[]> {
    return this.tabIds(this.modal);
  }

  private async tabIds(scope: Locator): Promise<string[]> {
    const prefix = `${this.base}-tab-`;
    const tabs = scope.getByTestId(new RegExp(`^${prefix}`));
    const count = await tabs.count();
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const testId = await tabs.nth(i).getAttribute('data-testid');
      if (testId?.startsWith(prefix)) {
        ids.push(testId.slice(prefix.length));
      }
    }
    return ids;
  }

  variableToken(name: string): Locator {
    return this.code.getByTestId(`variable-token-${name}`).first();
  }

  modalVariableToken(name: string): Locator {
    return this.modalCode.getByTestId(`variable-token-${name}`).first();
  }

  languageTab(language: string): Locator {
    return this.root.getByTestId(`${this.base}-tab-${language}`);
  }

  modalLanguageTab(language: string): Locator {
    return this.modal.getByTestId(`${this.base}-tab-${language}`);
  }

  async selectLanguage(language: string): Promise<void> {
    await this.languageTab(language).click();
  }

  /** Open the enlarged code-snippet view via the expand control. */
  async openExpandedView(): Promise<void> {
    await this.expandButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async openFromIcon(): Promise<void> {
    await this.iconTrigger.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async selectModalLanguage(language: string): Promise<void> {
    await this.modalLanguageTab(language).click();
  }
}
