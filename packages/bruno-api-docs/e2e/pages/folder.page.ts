import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SidebarComponent } from '../components/sidebar.component';
import { BreadcrumbComponent } from '../components/breadcrumb.component';
import { FolderConfigurationComponent } from '../components/folder/folder-configuration.component';
import { VariableCardComponent } from '../components/variable-card/variable-card.component';

export type FolderConfigGroup = 'headers' | 'auth' | 'vars' | 'script' | 'tests';

export class FolderPage extends BasePage {
  readonly root = this.page.getByTestId('folder-page');
  readonly title = this.page.getByTestId('folder-title');
  readonly requestCount = this.page.getByTestId('folder-request-count');
  readonly folderMarkdownDocs = this.page.getByTestId('folder-docs');
  readonly folderMarkdownDocsToggle = this.page.getByTestId('folder-docs-toggle');
  readonly emptyState = this.page.getByTestId('folder-config-empty');
  readonly configurationSection = this.page.getByTestId('folder-section-configuration');
  readonly executionContextSection = this.page.getByTestId('folder-section-execution-context');
  readonly executionContextEmptyState = this.page.getByTestId('folder-execution-context-empty');

  readonly sidebar = new SidebarComponent(this.page);
  readonly breadcrumb = new BreadcrumbComponent(this.page, 'folder-breadcrumb');
  readonly configuration = new FolderConfigurationComponent(this.page);
  readonly variableCard = new VariableCardComponent(this.page, this.root);

  configurationGroup(group: FolderConfigGroup): Locator {
    return this.configurationSection.getByTestId(`folder-config-${group}`);
  }

  executionContextGroup(group: FolderConfigGroup): Locator {
    return this.executionContextSection.getByTestId(`folder-config-${group}`);
  }

  async open(trail: string[], path = '/'): Promise<void> {
    await this.navigate(path);
    await this.sidebar.open(trail);
    await this.root.waitFor({ state: 'visible' });
  }
}
