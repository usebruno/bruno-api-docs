import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

/** A KeyValueTable instance (headers, params, variables …). Pass the table's testId to target a specific one. */
export class KeyValueTableComponent extends BaseComponent {
  readonly container: Locator;
  readonly table: Locator;
  readonly nameInputs: Locator;
  readonly valueInputs: Locator;
  readonly descriptionInputs: Locator;
  readonly descriptionHeader: Locator;
  readonly cellErrors: Locator;
  readonly autocomplete: Locator;
  readonly resizeHandles: Locator;

  constructor(page: Page, testId = 'key-value-table') {
    super(page, page.getByTestId(testId));
    this.container = page.getByTestId(`${testId}-container`);
    this.table = page.getByTestId(`${testId}-table`);
    this.nameInputs = page.getByTestId(`${testId}-name-input`);
    this.valueInputs = page.getByTestId(`${testId}-value-input`);
    this.descriptionInputs = page.getByTestId(`${testId}-description-input`);
    this.descriptionHeader = page.getByTestId(`${testId}-description-header`);
    this.cellErrors = page.getByTestId(`${testId}-error`);
    this.autocomplete = page.getByTestId('variable-autocomplete');
    this.resizeHandles = this.table.locator('.col-resize-handle');
  }

  /** The per-row enable/disable checkbox, addressed by the row name via its aria-label. */
  enableToggle(name: string): Locator {
    return this.table.getByRole('checkbox', { name: `Enable ${name}` });
  }

  /** A column's header cell, addressed by its `col-*` class — used to measure the column width. */
  columnHeader(colClass: string): Locator {
    return this.table.locator(`thead th.${colClass}`);
  }
}
