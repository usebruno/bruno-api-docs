import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SidebarComponent } from '../components/sidebar.component';
import { BreadcrumbComponent } from '../components/breadcrumb.component';
import { RequestUrlBarComponent } from '../components/request/url-bar.component';
import { ExecutionContextComponent } from '../components/request/execution-context.component';
import { CodeSnippetComponent } from '../components/request/code-snippet.component';
import { GrpcMessagesComponent } from '../components/request/grpc-messages.component';

export class GrpcRequestPage extends BasePage {
  readonly sidebar = new SidebarComponent(this.page);
  readonly breadcrumb = new BreadcrumbComponent(this.page, 'grpc-request-breadcrumb');
  readonly urlBar = new RequestUrlBarComponent(this.page);
  readonly messages = new GrpcMessagesComponent(this.page);
  readonly snippet = new CodeSnippetComponent(this.page, 'grpc-request-code-snippet');
  readonly executionContext = new ExecutionContextComponent(this.page);

  readonly root: Locator = this.page.getByTestId('grpc-request-page');
  readonly title: Locator = this.page.getByTestId('grpc-request-title');
  readonly description: Locator = this.page.getByTestId('grpc-request-description');

  readonly protoFileSection: Locator = this.page.getByTestId('grpc-request-section-proto-file');
  readonly protoFile: Locator = this.page.getByTestId('grpc-request-proto-file');

  readonly methodSection: Locator = this.page.getByTestId('grpc-request-section-method');
  readonly method: Locator = this.page.getByTestId('grpc-request-method');

  readonly messagesSection: Locator = this.page.getByTestId('grpc-request-section-messages');

  readonly metadataSection: Locator = this.page.getByTestId('grpc-request-section-metadata');
  readonly metadata: Locator = this.page.getByTestId('grpc-request-metadata');

  readonly authSection: Locator = this.page.getByTestId('grpc-request-section-auth');
  readonly auth: Locator = this.page.getByTestId('grpc-request-auth');
  readonly authInheritedBadge: Locator = this.page.getByTestId('grpc-request-auth-inherited');

  readonly emptyState: Locator = this.page.getByTestId('grpc-request-config-empty');
  readonly codeSnippet: Locator = this.snippet.code;

  readonly executionContextSection: Locator = this.page.getByTestId('grpc-request-section-execution-context');
  readonly executionContextEmpty: Locator = this.page.getByTestId('grpc-request-execution-context-empty');

  async open(path: string[]): Promise<void> {
    await this.navigate('/');
    await this.sidebar.open(path);
    await this.root.waitFor({ state: 'visible' });
  }
}
