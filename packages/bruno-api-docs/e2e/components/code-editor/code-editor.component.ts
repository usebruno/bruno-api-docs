import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

/**
 * A Monaco-backed code editor (see `src/ui/CodeEditor`). Only the container carries a test id;
 * Monaco renders its own DOM, so the editor surface, the text region we click to focus, and the
 * (portaled) autocomplete popup are matched by Monaco's stable class names and kept out of specs.
 */
export class CodeEditorComponent extends BaseComponent {
  readonly copyButton: Locator;
  readonly suggestions: Locator;
  private readonly surface: Locator;
  private readonly focused: Locator;
  private readonly lines: Locator;
  private readonly ready: Locator;

  constructor(page: Page, testId: string) {
    super(page, page.getByTestId(testId));
    this.copyButton = this.root.getByTestId(`${testId}-copy`);
    this.surface = this.root.locator('.monaco-editor');
    this.focused = this.root.locator('.monaco-editor.focused');
    this.lines = this.root.locator('.view-lines');
    this.suggestions = page.locator('.suggest-widget.visible');
    this.ready = page.locator(`[data-testid="${testId}"][data-editor-ready="true"]`);
  }

  async focus(): Promise<void> {
    await this.surface.waitFor({ state: 'visible', timeout: 20000 });
    // Autocomplete needs the editor's model tagged with its Bruno API roots. Tagging can lag the
    // visible surface when the editor first mounts inside a hidden tab panel, so wait for the
    // editor to report ready before typing — otherwise the trigger fires against an untagged model.
    await this.ready.waitFor({ state: 'attached', timeout: 20000 });
    await this.lines.click();
    await this.focused.waitFor({ state: 'attached', timeout: 20000 });
  }

  async typeAndSuggest(text: string): Promise<void> {
    await this.page.keyboard.type(text, { delay: 30 });
    await this.page.keyboard.press('Control+Space');
  }
}
