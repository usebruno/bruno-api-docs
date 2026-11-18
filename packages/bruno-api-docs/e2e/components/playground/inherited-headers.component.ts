import type { Locator } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class InheritedHeadersComponent extends BaseComponent {
  readonly view = this.page.getByTestId('playground-view');
  readonly toggle = this.view.getByTestId('toggle-inherited-headers');
  readonly inheritedSectionToggle = this.view.getByTestId('inherited-headers-section-toggle');
  readonly requestSectionToggle = this.view.getByTestId('request-headers-section-toggle');
  readonly rows = this.view.getByTestId(/^inherited-header-row-/);

  row(name: string): Locator {
    return this.view.getByTestId(`inherited-header-row-${name.toLowerCase()}`);
  }

  checkbox(name: string): Locator {
    return this.row(name).getByRole('checkbox');
  }

  sourceLink(name: string): Locator {
    return this.view.getByTestId(`inherited-header-source-${name.toLowerCase()}`);
  }
}
