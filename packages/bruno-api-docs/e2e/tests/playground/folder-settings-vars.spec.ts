import { test, expect } from '../../playwright';

test.describe('Playground folder settings, Vars tab', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openTreeItem(['billing']);
    await playground.folderSettingsTab('variables').click();
  });

  test('offers both a Pre Request and a Post Response table', async ({ playground }) => {
    await expect(playground.preRequestVars.root).toBeVisible();
    await expect(playground.postResponseVars.root).toBeVisible();
  });

  test('keeps an edited post-response variable across a tab switch', async ({ playground }) => {
    const { postResponseVars } = playground;
    const blankRowIndex = (await postResponseVars.nameInputs.count()) - 1;
    await postResponseVars.nameInputs.nth(blankRowIndex).fill('sessionId');
    await postResponseVars.valueInputs.nth(blankRowIndex).fill('res.body.id');

    await playground.folderSettingsTab('headers').click();
    await playground.folderSettingsTab('variables').click();

    await expect(postResponseVars.nameInputs.nth(blankRowIndex)).toHaveValue('sessionId');
    await expect(postResponseVars.valueInputs.nth(blankRowIndex)).toHaveValue('res.body.id');
  });
});
