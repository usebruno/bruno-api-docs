import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';

const exactText = (value: string) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

export class SidebarComponent extends BaseComponent {
  readonly items = this.page.getByTestId('sidebar-item');
  readonly active = this.items.and(this.page.locator('.active'));
  readonly labels = this.items.getByTestId('sidebar-item-label');
  readonly inline = this.page.getByTestId('app-sidebar');
  readonly overview = this.page.getByTestId('sidebar-overview');
  readonly environments = this.page.getByTestId('sidebar-environments');
  readonly collapseButton = this.page.getByTestId('sidebar-collapse');
  readonly expandButton = this.page.getByTestId('sidebar-expand');
  readonly resizer = this.page.getByTestId('sidebar-resizer');
  readonly drawer = this.page.getByTestId('sidebar-drawer');
  readonly backdrop = this.page.getByTestId('sidebar-backdrop');
  readonly hamburger = this.page.getByTestId('topbar-menu');

  item(name: string): Locator {
    return this.items.filter({
      has: this.page.getByTestId('sidebar-item-label').filter({ hasText: exactText(name) })
    });
  }

  itemBySlug(slug: string): Locator {
    return this.items.and(this.page.locator(`[data-slug="${slug}"]`));
  }

  methodBadge(name: string): Locator {
    return this.item(name).getByTestId('sidebar-item-method');
  }

  /** Folder arrow. Named from its accessible label, which flips between Expand and Collapse. */
  folderChevron(name: string): Locator {
    return this.item(name).getByRole('button', { name: /^(Expand|Collapse) folder$/ });
  }

  async toggleFolder(name: string): Promise<void> {
    await this.folderChevron(name).click();
  }

  exampleToggle(requestName: string): Locator {
    return this.item(requestName).getByTestId('sidebar-example-toggle');
  }

  exampleRow(exampleName: string): Locator {
    return this.page.getByTestId('sidebar-example').filter({
      has: this.page.getByTestId('sidebar-example-label').filter({ hasText: exactText(exampleName) })
    });
  }

  async toggleExamples(requestName: string): Promise<void> {
    await this.exampleToggle(requestName).click();
  }

  async open(paths: string[]): Promise<void> {
    for (const name of paths) {
      await this.item(name).click();
    }
  }

  async width(): Promise<number> {
    const box = await this.inline.boundingBox();
    return box?.width ?? 0;
  }

  async grabResizer(): Promise<void> {
    await this.grabHandle(this.resizer);
  }

  async collapse(): Promise<void> {
    await this.inline.hover();
    await this.collapseButton.click();
  }

  async expand(): Promise<void> {
    await this.expandButton.click();
  }

  async openDrawer(): Promise<void> {
    await this.hamburger.click();
  }

  async closeDrawerViaBackdrop(): Promise<void> {
    await this.backdrop.click({ position: { x: 375, y: 400 } });
  }
}
