import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { appConfig } from '../config/app.config';
import type { ApiDocsInstance, ApiPlaygroundInstance, ApiPlaygroundOptions } from '../../standalone';
import { EnvSwitcherComponent } from '../components/layout/env-switcher.component';
import { ResponsePaneComponent } from '../components/playground/response-pane.component';

type Target = 'first' | 'second';
type HostFile = 'api-playground.html' | 'index.html';

type Content = ApiPlaygroundOptions['content'];

type HostWindow = Window & { instances: Partial<Record<Target, ApiPlaygroundInstance | ApiDocsInstance>> };

/**
 * A static host page that mounts `Bruno.apiPlayground`. `api-playground.html` loads only
 * `api-playground.js` and `api-docs.css`; `index.html` loads `api-docs.js`. Two empty targets.
 * Every script the page requests from the standalone origin is recorded by path.
 */
export class ApiPlaygroundPage extends BasePage {
  readonly scriptRequests: string[] = [];
  readonly consoleLogs: string[] = [];

  constructor(page: Page) {
    super(page);
    page.on('console', (message) => {
      if (message.type() === 'log') this.consoleLogs.push(message.text());
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (request.resourceType() === 'script' && url.origin === appConfig.standaloneURL) this.scriptRequests.push(url.pathname);
    });
  }

  target(id: Target): Locator {
    return this.page.getByTestId(`standalone-${id}`);
  }

  url(file: HostFile = 'api-playground.html'): string {
    return `${appConfig.standaloneURL}/${file}`;
  }

  async goto(file: HostFile = 'api-playground.html'): Promise<void> {
    await this.navigate(this.url(file));
  }

  instance(id: Target) {
    const scope = this.target(id);
    const sidebar = scope.getByTestId('playground-sidebar-panel');
    return {
      root: scope.getByTestId('standalone-playground'),
      docsShell: scope.getByTestId('app-shell'),
      dockHeader: scope.getByTestId('playground-header'),
      loadError: scope.getByTestId('playground-load-error'),
      sidebar,
      sidebarToggle: scope.getByTestId('playground-sidebar-toggle'),
      sidebarBackdrop: scope.getByTestId('playground-sidebar-backdrop'),
      treeItems: sidebar.getByTestId('sidebar-item'),
      treeItem: (name: string) => sidebar.getByTestId('sidebar-item').filter({ hasText: name }),
      urlInput: scope.getByTestId('query-bar-url'),
      envSwitcher: new EnvSwitcherComponent(this.page, 'playground-env-switcher', scope),
      responsePane: new ResponsePaneComponent(this.page, scope)
    };
  }

  async mount(id: Target, content: unknown, theme?: { variant?: string; mode?: string }): Promise<void> {
    await this.page.evaluate(({ id, content, theme }) => {
      const w = window as unknown as HostWindow;
      w.instances ??= {};
      w.instances[id] = w.Bruno.apiPlayground(document.getElementById(id)!, {
        content: content as Content,
        ...(theme ? { theme: theme as never } : {})
      });
    }, { id, content, theme });
  }

  async mountDocs(id: Target, content: unknown): Promise<void> {
    await this.page.evaluate(({ id, content }) => {
      const w = window as unknown as HostWindow;
      w.instances ??= {};
      w.instances[id] = w.Bruno.apiDocs(document.getElementById(id)!, { content: content as Content });
    }, { id, content });
  }

  async updateCollection(id: Target, content: unknown): Promise<void> {
    await this.page.evaluate(({ id, content }) => {
      (window as unknown as HostWindow).instances[id]!.updateCollection(content as Content);
    }, { id, content });
  }

  async destroy(id: Target): Promise<void> {
    await this.page.evaluate((id) => {
      (window as unknown as HostWindow).instances[id]!.destroy();
    }, id);
  }

  async addApiDocsScript(): Promise<void> {
    await this.page.addScriptTag({ url: `${appConfig.standaloneURL}/api-docs.js` });
  }

  brunoKeys(): Promise<string[]> {
    return this.page.evaluate(() => Object.keys((window as unknown as HostWindow).Bruno).sort());
  }

  async setTargetHeight(id: Target, px: number): Promise<void> {
    await this.target(id).evaluate((element, px) => {
      element.style.height = `${px}px`;
    }, px);
  }

  targetOverflow(id: Target): Promise<number> {
    return this.target(id).evaluate((element) => element.scrollHeight - element.clientHeight);
  }

  async failPlaygroundViewOnce(): Promise<void> {
    await this.page.route(/\/playground-view-[\w-]+\.js$/, (route) => route.fulfill({ status: 404, body: 'not found' }), { times: 1 });
  }

  async forwardToEcho(origin: string): Promise<void> {
    await this.page.route(`${origin}/**`, async (route) => {
      const response = await route.fetch({ url: `${appConfig.testServerURL}/echo` });
      await route.fulfill({ response });
    });
  }
}
