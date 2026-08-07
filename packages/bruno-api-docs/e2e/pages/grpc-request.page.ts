import { BasePage } from './base.page';
import { SidebarComponent } from '../components/sidebar.component';
import { BreadcrumbComponent } from '../components/breadcrumb.component';
import { RequestUrlBarComponent } from '../components/request/url-bar.component';

export class GrpcRequestPage extends BasePage {
  readonly sidebar = new SidebarComponent(this.page);
  readonly breadcrumb = new BreadcrumbComponent(this.page, 'grpc-request-breadcrumb');
  readonly urlBar = new RequestUrlBarComponent(this.page);

  readonly root = this.page.getByTestId('grpc-request-page');
  readonly title = this.page.getByTestId('grpc-request-title');
  readonly description = this.page.getByTestId('grpc-request-description');

  readonly protoFileSection = this.page.getByTestId('grpc-request-section-proto-file');
  readonly protoFile = this.page.getByTestId('grpc-request-proto-file');

  readonly methodSection = this.page.getByTestId('grpc-request-section-method');
  readonly method = this.page.getByTestId('grpc-request-method');

  readonly messagesSection = this.page.getByTestId('grpc-request-section-messages');
  readonly messages = this.page.getByTestId('grpc-messages');
  readonly showToggle = this.page.getByTestId('grpc-messages-show-toggle');

  readonly metadataSection = this.page.getByTestId('grpc-request-section-metadata');
  readonly metadata = this.page.getByTestId('grpc-request-metadata');

  readonly authSection = this.page.getByTestId('grpc-request-section-auth');
  readonly auth = this.page.getByTestId('grpc-request-auth');
  readonly authInheritedBadge = this.page.getByTestId('grpc-request-auth-inherited');

  readonly emptyState = this.page.getByTestId('grpc-request-config-empty');

  messageCard(index: number) {
    return this.page.getByTestId(`grpc-messages-card-${index}`);
  }

  messageToggle(index: number) {
    return this.page.getByTestId(`grpc-messages-card-${index}-toggle`);
  }

  messageCode(index: number) {
    return this.page.getByTestId(`grpc-messages-card-${index}-code`);
  }

  async open(path: string[]): Promise<void> {
    await this.navigate('/');
    await this.sidebar.open(path);
    await this.root.waitFor({ state: 'visible' });
  }
}
