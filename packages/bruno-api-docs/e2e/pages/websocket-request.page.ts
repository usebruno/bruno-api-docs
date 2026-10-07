import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SidebarComponent } from '../components/sidebar.component';
import { BreadcrumbComponent } from '../components/breadcrumb.component';
import { RequestUrlBarComponent } from '../components/request/url-bar.component';
import { GrpcMessagesComponent } from '../components/request/grpc-messages.component';

export class WebsocketRequestPage extends BasePage {
  readonly sidebar = new SidebarComponent(this.page);
  readonly breadcrumb = new BreadcrumbComponent(this.page, 'websocket-request-breadcrumb');
  readonly urlBar = new RequestUrlBarComponent(this.page);
  readonly messages = new GrpcMessagesComponent(this.page, 'websocket-request-messages');

  readonly root: Locator = this.page.getByTestId('websocket-request-page');
  readonly title: Locator = this.page.getByTestId('websocket-request-title');
  readonly description: Locator = this.page.getByTestId('websocket-request-description');

  readonly messagesSection: Locator = this.page.getByTestId('websocket-request-section-messages');
  readonly headersSection: Locator = this.page.getByTestId('websocket-request-section-headers');
  readonly authSection: Locator = this.page.getByTestId('websocket-request-section-auth');
  readonly authInheritedBadge: Locator = this.page.getByTestId('websocket-request-auth-inherited');

  async open(path: string[]): Promise<void> {
    await this.navigate('/');
    await this.sidebar.open(path);
    await this.root.waitFor({ state: 'visible' });
  }
}
