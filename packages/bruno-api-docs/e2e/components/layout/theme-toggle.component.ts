import { BaseComponent } from '../base.component';

export class ThemeToggleComponent extends BaseComponent {
  readonly button = this.page.getByTestId('theme-toggle');
  readonly tooltip = this.page.getByTestId('theme-toggle-tooltip');

  async toggle(): Promise<void> {
    await this.button.click();
  }
}
