import type { Page, Locator } from '@playwright/test';

export abstract class BaseComponent {
  readonly root: Locator;
  private dragX = 0;
  private dragY = 0;

  constructor(protected readonly page: Page, root?: Locator) {
    this.root = root ?? page.locator(':root');
  }

  async hidesVerticalOverflow(target: Locator): Promise<boolean> {
    return target.evaluate((el) => getComputedStyle(el).overflowY !== 'visible');
  }

  async isContentWiderThanBox(target: Locator): Promise<boolean> {
    return target.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  }

  async getScrollbarColor(target: Locator): Promise<string> {
    return target.evaluate((el) => getComputedStyle(el).scrollbarColor);
  }

  /** Press the pointer on a resize handle; the grab point is kept for later moves. */
  protected async grabHandle(handle: Locator): Promise<void> {
    const box = await handle.boundingBox();
    this.dragX = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    this.dragY = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await handle.hover();
    await this.page.mouse.down();
  }

  /** Move the held pointer to an absolute x (keeps the grabbed y). */
  async movePointerToX(x: number): Promise<void> {
    await this.page.mouse.move(x, this.dragY, { steps: 10 });
  }

  /** Move the held pointer to an absolute y (keeps the grabbed x). */
  async movePointerToY(y: number): Promise<void> {
    await this.page.mouse.move(this.dragX, y, { steps: 10 });
  }

  async releasePointer(): Promise<void> {
    await this.page.mouse.up();
  }
}
