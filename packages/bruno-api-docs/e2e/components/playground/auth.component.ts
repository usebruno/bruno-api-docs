import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';

// The Auth tab inside the playground request pane: the auth-mode dropdown, its options,
// and the notice shown when a request inherits its auth. Open the tab via
// playground.selectTab('auth').
export class RequestAuthComponent extends BaseComponent {
  readonly view = this.page.getByTestId('playground-view');
  readonly modeSelect = this.page.getByTestId('request-auth-mode-select');
  readonly panelModeSelect = this.view.getByTestId('auth-tab-mode-select');
  readonly inheritNotice = this.page.getByTestId('auth-inherit-notice');
  readonly options = this.page.getByTestId(/^request-auth-mode-select-(?!dropdown$)/);
  readonly inheritedSource = this.view.getByTestId('auth-inherited-source');
  readonly inheritedMode = this.view.getByTestId('inherited-auth-mode');

  option(value: string): Locator {
    return this.page.getByTestId(`request-auth-mode-select-${value}`);
  }

  inheritedField(name: string): Locator {
    return this.view.getByTestId(`auth-inherited-${name}`);
  }

  field(name: string): Locator {
    return this.page.getByTestId(`auth-${name}`);
  }

  async open(): Promise<void> {
    await this.modeSelect.click();
  }

  async selectMode(value: string): Promise<void> {
    await this.modeSelect.click();
    await this.option(value).click();
  }
}
