import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { CodeSnippetComponent } from './code-snippet.component';

export class ExamplesComponent extends BaseComponent {
  readonly snippet = new CodeSnippetComponent(this.page, 'example-code-snippet');

  readonly root = this.page.getByTestId('request-examples');

  readonly items = this.root.getByTestId('example-card');

  // The card the sidebar navigated to (data-active set by ExampleCard).
  readonly activeCard = this.root.locator('[data-testid="example-card"][data-active="true"]');

  example(name: string): Locator {
    return this.items.filter({ hasText: name });
  }

  statusCode(name: string): Locator {
    return this.example(name).getByTestId('example-status');
  }

  requestBody(name: string): Locator {
    return this.example(name).getByTestId('example-request-pane-body');
  }

  responseBody(name: string): Locator {
    return this.example(name).getByTestId('example-response-pane-body');
  }

  async open(name: string): Promise<void> {
    await this.example(name).getByTestId('example-toggle').click();
  }

  // The snippet dialog is portalled to <body>, so it is scoped to the page, not the card.
  readonly snippetModal = this.page.getByRole('dialog', { name: 'Code snippet' });

  readonly snippetCode = this.snippet.modalCode;

  snippetButton(name: string): Locator {
    return this.example(name).getByTestId('example-code-snippet-trigger');
  }

  snippetLanguageTab(language: string): Locator {
    return this.snippet.modalLanguageTab(language);
  }

  async openSnippet(name: string): Promise<void> {
    await this.snippetButton(name).click();
    await this.snippetModal.waitFor({ state: 'visible' });
  }

  async selectRequestTab(name: string, tab: string): Promise<void> {
    await this.example(name).getByTestId(`example-request-pane-tab-${tab}`).click();
  }

  async selectResponseTab(name: string, tab: string): Promise<void> {
    await this.example(name).getByTestId(`example-response-pane-tab-${tab}`).click();
  }
}
