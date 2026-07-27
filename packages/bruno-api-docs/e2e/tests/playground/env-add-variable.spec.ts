import { test, expect } from '../../playwright';

test.describe('Environment variables — adding rows (card view)', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('a filled name and value in the trailing blank card adds a new variable row', async ({ playground, envEditor }) => {
    await playground.open('inline');
    await playground.openEnvironments();

    await expect(envEditor.nameInputs.first()).toBeVisible();
    const before = await envEditor.nameInputs.count();

    await envEditor.nameInputs.last().fill('newVariable');
    await expect(envEditor.nameInputs).toHaveCount(before);

    await envEditor.valueInputs.last().fill('newValue');
    await expect(envEditor.nameInputs).toHaveCount(before + 1);
    await expect(envEditor.nameInputs.nth(before - 1)).toHaveValue('newVariable');
    await expect(envEditor.valueInputs.nth(before - 1)).toHaveValue('newValue');
  });

  test('toggling a variable checkbox enables/disables its card', async ({ playground, envEditor }) => {
    await playground.open('inline');
    await playground.openEnvironments();

    const toggle = envEditor.enableToggle('host');
    const card = envEditor.cardFor('host');
    const disabled = /(^|\s)disabled(\s|$)/;

    await expect(toggle).toBeChecked();
    await expect(card).not.toHaveClass(disabled);

    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await expect(card).toHaveClass(disabled);

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(card).not.toHaveClass(disabled);
  });

  test('a variable description is editable below the value and persists across an environment switch', async ({
    playground,
    envEditor
  }) => {
    await playground.open('inline');
    await playground.openEnvironments();

    // Each variable card carries a Description field (placeholder "Description") under its value.
    const description = envEditor.descriptionInputs.first();
    await description.fill('The API host');
    await expect(description).toHaveValue('The API host');

    // Switching environments and back re-derives the rows from the store; the edit was committed.
    await envEditor.selectEnvironment('Prod');
    await envEditor.selectEnvironment('Local');
    await expect(envEditor.descriptionInputs.first()).toHaveValue('The API host');
  });
});

test.describe('Environment variables — descriptions (desktop table)', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('the non-inline table renders a Description column for variables', async ({ page, playground }) => {
    // A non-inline dock uses the full KeyValueTable (not the compact cards).
    await playground.open('bottom');
    await playground.openEnvironments();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
  });
});
