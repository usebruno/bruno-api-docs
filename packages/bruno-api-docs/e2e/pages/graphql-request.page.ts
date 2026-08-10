import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SidebarComponent } from '../components/sidebar.component';
import { BreadcrumbComponent } from '../components/breadcrumb.component';
import { RequestUrlBarComponent } from '../components/request/url-bar.component';
import { CodeSnippetComponent } from '../components/request/code-snippet.component';
import { ExecutionContextComponent } from '../components/request/execution-context.component';

export class GraphqlRequestPage extends BasePage {
  readonly root = this.page.getByTestId('graphql-request-page');
  readonly title = this.page.getByTestId('request-title');
  readonly description = this.page.getByTestId('request-description');

  readonly sidebar = new SidebarComponent(this.page);
  readonly breadcrumb = new BreadcrumbComponent(this.page, 'request-breadcrumb');
  readonly urlBar = new RequestUrlBarComponent(this.page);
  readonly codeSnippet = new CodeSnippetComponent(this.page);
  readonly executionContext = new ExecutionContextComponent(this.page);

  readonly query = this.page.getByTestId('request-graphql-query');
  readonly variables = this.page.getByTestId('request-graphql-variables');

  async open(path: string[]): Promise<void> {
    await this.navigate('/');
    await this.sidebar.open(path);
    await this.root.waitFor({ state: 'visible' });
  }

  section(label: string): Locator {
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    return this.page.getByTestId(`request-section-${slug}`);
  }
}
