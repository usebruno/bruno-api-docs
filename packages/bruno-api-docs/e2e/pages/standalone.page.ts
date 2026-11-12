import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { appConfig } from '../config/app.config';

export type StandaloneTarget = 'first' | 'second';

type ApiDocsOptions = Record<string, unknown> & { content: unknown };

interface Instance {
  updateCollection(content: unknown): void;
  updateOptions(options: Record<string, unknown>): void;
  destroy(): void;
}

type StandaloneWindow = Window & {
  Bruno: { apiDocs(target: HTMLElement, options: ApiDocsOptions): Instance };
  instances: Partial<Record<StandaloneTarget, Instance>>;
};

/**
 * A static host page that loads the built `dist-standalone/api-docs.js` and mounts it
 * with `Bruno.apiDocs`, the way an embedding site does. Two empty targets are on the page.
 */
export class StandalonePage extends BasePage {
  readonly root = this.target('first');

  target(id: StandaloneTarget): Locator {
    return this.page.getByTestId(`standalone-${id}`);
  }

  async goto(): Promise<void> {
    await this.navigate(`${appConfig.standaloneURL}/index.html`);
  }

  async mount(id: StandaloneTarget, options: ApiDocsOptions): Promise<void> {
    await this.page.evaluate(({ id, options }) => {
      const w = window as unknown as StandaloneWindow;
      w.instances ??= {};
      w.instances[id] = w.Bruno.apiDocs(document.getElementById(id)!, options);
    }, { id, options });
  }

  async mountFile(id: StandaloneTarget, text: string, name: string): Promise<void> {
    await this.page.evaluate(({ id, text, name }) => {
      const w = window as unknown as StandaloneWindow;
      w.instances ??= {};
      w.instances[id] = w.Bruno.apiDocs(document.getElementById(id)!, { content: new File([text], name) });
    }, { id, text, name });
  }

  async updateCollection(id: StandaloneTarget, content: unknown): Promise<void> {
    await this.page.evaluate(({ id, content }) => {
      (window as unknown as StandaloneWindow).instances[id]!.updateCollection(content);
    }, { id, content });
  }

  async updateOptions(id: StandaloneTarget, options: Record<string, unknown>): Promise<void> {
    await this.page.evaluate(({ id, options }) => {
      (window as unknown as StandaloneWindow).instances[id]!.updateOptions(options);
    }, { id, options });
  }

  async destroy(id: StandaloneTarget): Promise<void> {
    await this.page.evaluate((id) => {
      (window as unknown as StandaloneWindow).instances[id]!.destroy();
    }, id);
  }
}
