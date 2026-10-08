import { test, expect } from '../../playwright';

test.describe('Playground code editor: find widget tooltips', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.selectTab('scripts');
    await playground.preRequestScriptEditor.openSearchBox();
  });

  for (const label of [/^Find in Selection/, /^Close/, /^Previous Match/]) {
    test(`the "${label.source.slice(1)}" tooltip renders outside the editor, on one line, above its button`, async ({ playground }) => {
      const editor = playground.preRequestScriptEditor;
      const button = editor.searchBoxButton(label);

      await button.hover();
      await expect(editor.contextViewHover).toBeVisible();

      const buttonBox = await button.boundingBox();
      const hoverBox = await editor.contextViewHover.boundingBox();
      expect(hoverBox!.y + hoverBox!.height).toBeLessThanOrEqual(buttonBox!.y);
      expect(hoverBox!.height).toBeLessThan(buttonBox!.height * 2);
    });
  }
});
