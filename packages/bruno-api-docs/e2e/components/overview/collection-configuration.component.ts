import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { SecretValueComponent } from '../secret-value.component';

export type ConfigurationGroup = 'headers' | 'auth' | 'vars' | 'script' | 'tests';

export class ConfigurationSection extends BaseComponent {
  readonly copyButton: Locator;
  readonly secret: SecretValueComponent;
  readonly disabledRows: Locator;

  private readonly testId: string;

  constructor(page: Page, testId = 'collection-config') {
    super(page, page.getByTestId(testId));
    this.testId = testId;
    this.copyButton = this.root.getByTestId(`${testId}-tests-copy`);
    this.secret = new SecretValueComponent(page, `${testId}-auth-token-secret`);
    this.disabledRows = this.root
      .getByTestId('property-value-line')
      .filter({ has: page.getByTestId('disabled-badge') });
  }

  subHeading(group: ConfigurationGroup): Locator {
    return this.root.getByTestId(`${this.testId}-${group}-subheading`);
  }

  async copyToClipboard(): Promise<void> {
    await this.copyButton.click();
  }
}
