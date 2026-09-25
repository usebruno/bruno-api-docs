import { test, expect } from '../../playwright';

test.describe('Rendered markdown documentation', () => {
  test.beforeEach(async ({ folderPage }) => {
    await folderPage.open(['billing']);
    await expect(folderPage.folderMarkdownDocs).toBeVisible();
    await folderPage.folderMarkdownDocsToggle.click();
    await expect(folderPage.folderMarkdownDocsToggle).toHaveText('View less');
  });

  test('renders each heading level at a distinct, decreasing size', async ({ folderPage }) => {
    const docs = folderPage.folderMarkdownDocs;
    const sizeOf = async (tag: string): Promise<number> => {
      const px = await docs.locator(tag).first().evaluate((el) => getComputedStyle(el).fontSize);
      return parseFloat(px);
    };

    const [h1, h2, h3, h4] = [await sizeOf('h1'), await sizeOf('h2'), await sizeOf('h3'), await sizeOf('h4')];

    expect(h1).toBeGreaterThan(h2);
    expect(h2).toBeGreaterThan(h3);
    expect(h3).toBeGreaterThan(h4);
  });

  test('renders a literal <br/> as a line break rather than as text', async ({ folderPage }) => {
    const docs = folderPage.folderMarkdownDocs;

    await expect(docs).not.toContainText('<br');
    await expect(docs).toContainText('Line one');
    await expect(docs).toContainText('line two');
    await expect(docs.locator('br')).toHaveCount(1);
  });

  test('renders task list items as checkboxes, not as [ ] / [x] text', async ({ folderPage }) => {
    const docs = folderPage.folderMarkdownDocs;
    const checkboxes = docs.locator('input[type="checkbox"]');

    await expect(checkboxes).toHaveCount(6);
    await expect(docs).not.toContainText('[x]');
    await expect(docs).not.toContainText('[ ]');

    await test.step('the checked item shows a tick and the unchecked one does not', async () => {
      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
    });

    await test.step('the boxes are read-only in published docs', async () => {
      await expect(checkboxes.nth(0)).toBeDisabled();
    });

    await test.step('a completed item struck through in Bruno renders struck through here', async () => {
      const struck = docs.locator('li.task-list-item s').first();
      await expect(struck).toHaveText('Invoice export shipped');
      await expect(struck).toHaveCSS('text-decoration-line', 'line-through');
    });

    await test.step('a plain list item in the same list keeps its bullet', async () => {
      const plain = docs.locator('li', { hasText: 'Not a task item' }).first();
      await expect(plain).toHaveCSS('list-style-type', 'disc');
    });

    await test.step('inline markup inside an item keeps normal word spacing', async () => {
      const item = docs.locator('li.task-list-item', { hasText: 'Review the' }).first();
      await expect(item.locator('> .task-list-item-content')).toHaveCount(1);

      const gap = await item.evaluate((el) => {
        const strong = el.querySelector('strong');
        if (!strong?.previousSibling) return -1;
        const range = document.createRange();
        range.selectNodeContents(strong.previousSibling);
        return Math.round(strong.getBoundingClientRect().left - range.getBoundingClientRect().right);
      });

      expect(gap).toBe(0);
    });

    await test.step('a second block inside an item stacks below it, not beside it', async () => {
      const item = docs.locator('li.task-list-item', { hasText: 'Multi-block item' }).first();
      const paras = item.locator('> p');
      await expect(paras).toHaveCount(2);

      const [first, second] = [await paras.nth(0).boundingBox(), await paras.nth(1).boundingBox()];
      if (!first || !second) throw new Error('expected both blocks to be laid out');
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    });

    await test.step('a nested task list sits below its parent, not beside it', async () => {
      const parent = docs.locator('li.task-list-item', { hasText: 'Parent task' }).first();
      const nestedItem = parent.locator('ul li').first();

      const [parentBox, nestedBox] = [await parent.boundingBox(), await nestedItem.boundingBox()];
      if (!parentBox || !nestedBox) throw new Error('expected the nested task list to be laid out');

      expect(nestedBox.y).toBeGreaterThan(parentBox.y);
      expect(nestedBox.x).toBeGreaterThan(parentBox.x);
    });
  });

  test('renders code blocks on the docs code surface with syntax highlighting', async ({ folderPage }) => {
    const pre = folderPage.folderMarkdownDocs.locator('pre').first();

    await expect(pre).toBeVisible();
    await expect(pre).toContainText('bru.get(\'/invoices/42\')');

    await test.step('the block uses the app code-surface token (the suite runs the light theme)', async () => {
      const [background, token, borderWidth] = await pre.evaluate((el) => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'var(--oc-sidebar-bg)';
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();

        const style = getComputedStyle(el);
        return [style.backgroundColor, expected, style.borderTopWidth];
      });

      expect(background).toBe(token);
      expect(borderWidth).toBe('1px');
    });

    await test.step('the fence is syntax highlighted', async () => {
      await expect(pre.locator('.hljs-keyword').first()).toBeVisible();
    });
  });

  test('every code block exposes a working Copy control', async ({ folderPage, page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const block = folderPage.folderMarkdownDocs.locator('.md-code-block').first();
    const pre = block.locator('pre');
    const copy = block.getByTestId('markdown-code-copy');

    await expect(copy).toBeVisible();
    await copy.click();

    await test.step('the button acknowledges the copy', async () => {
      await expect(block.getByTestId('markdown-code-copy-tick')).toBeVisible();
    });

    await test.step('the control stays pinned when a wide block is scrolled sideways', async () => {
      const before = await copy.boundingBox();

      const scrollable = await pre.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
        return el.scrollWidth > el.clientWidth;
      });
      expect(scrollable).toBe(true);

      const after = await copy.boundingBox();
      if (!before || !after) throw new Error('expected the copy control to stay visible');
      expect(after.x).toBe(before.x);
    });

    await test.step('the clipboard holds the code, without the button label', async () => {
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toContain('const invoice = await bru.get(\'/invoices/42\');');
      expect(clipboard).not.toContain('Copy');
    });
  });
});
