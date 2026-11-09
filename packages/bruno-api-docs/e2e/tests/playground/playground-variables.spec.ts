import { test, expect } from '../../playwright';

const VARS_PLAYGROUND = '/?fixture=vars#/?pg=1&dock=bottom';

test.describe('Playground variables: highlight, hover card and inline edit', () => {
  test.beforeEach(async ({ page, playground }) => {
    await page.goto(VARS_PLAYGROUND);
    await playground.runner.waitFor({ state: 'visible' });
    await playground.openTreeItem(['Customers', 'Variables Demo']);
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');
  });

  test('highlights a resolved variable in the URL bar', async ({ playground }) => {
    await expect(playground.variable.token('host')).toHaveClass(/variable-valid/);
  });

  test('paints variable tokens in the request body editor', async ({ playground }) => {
    await playground.selectTab('body');
    await expect(playground.variable.monacoValid.first()).toBeVisible();
  });

  test('hovering a body variable shows its card with scope and resolved value', async ({ playground }) => {
    await playground.selectTab('body');
    await playground.variable.hoverMonacoToken('host');
    await expect(playground.variable.name).toHaveText('host');
    await expect(playground.variable.scopeBadge).toHaveText('Environment');
    await expect(playground.variable.value).toHaveText('https://api.dev.example.com');
  });

  test('the body card stays clear of its token as the edit field grows', async ({ playground }) => {
    await playground.selectTab('body');
    await playground.variable.hoverMonacoToken('host');

    await playground.variable.value.click();
    await playground.variable.editField.fill('one\ntwo\nthree\nfour\nfive');

    await expect.poll(() => playground.variable.overlapsMonacoToken('host')).toBe(false);
  });

  test('hovering a URL variable shows its card with scope and resolved value', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.name).toHaveText('host');
    await expect(playground.variable.scopeBadge).toHaveText('Environment');
    await expect(playground.variable.value).toHaveText('https://api.dev.example.com');
  });

  test('editing a variable from the card updates its resolved value', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.editTo('https://edited.example.com');
    await expect(playground.variable.value).toHaveText('https://edited.example.com');
  });

  test('Escape discards an edit', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.startEditing('https://discarded.example.com');
    await playground.variable.editField.press('Escape');

    await expect(playground.variable.value).toHaveText('https://api.dev.example.com');
  });

  test('clicking away saves the edit', async ({ page, playground }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.startEditing('https://blurred.example.com');
    await page.keyboard.press('Tab');

    await expect(playground.variable.value).toHaveText('https://blurred.example.com');
  });

  test('Shift-Enter adds a newline instead of saving', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.startEditing('first');
    await playground.variable.editField.press('Shift+Enter');
    await playground.variable.editField.press('s');

    await expect(playground.variable.editField).toHaveValue('first\ns');
  });

  test('a read-only scope is not editable', async ({ playground }) => {
    await playground.selectTab('headers');
    await playground.variable.hoverInputToken('process.env.HOME');
    await expect(playground.variable.note).toHaveText('read-only');

    await playground.variable.value.click();
    await expect(playground.variable.editField).toHaveCount(0);
  });

  test('clicking the value puts the caret at the end, not the start', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.value.click();

    const caret = await playground.variable.editField.evaluate(
      (el: HTMLTextAreaElement) => ({ start: el.selectionStart, end: el.selectionEnd, length: el.value.length })
    );

    expect(caret.length).toBeGreaterThan(0);
    expect(caret.start).toBe(caret.length);
    expect(caret.end).toBe(caret.length);
  });

  test('the copy control stays available while the value is being edited', async ({ playground }) => {
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.copyButton).toBeVisible();

    await playground.variable.startEditing('https://edited.example.com');

    await expect(playground.variable.editField).toBeVisible();
    await expect(playground.variable.copyButton).toBeVisible();
  });

  test('an unset secret starts blank with a reveal control and takes a typed value', async ({ playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');

    await expect(playground.variable.value).toHaveText('');
    await expect(playground.variable.revealToggle).toBeVisible();

    await playground.variable.editTo('typed-secret');

    await expect(playground.variable.value).toHaveText('*'.repeat('typed-secret'.length));

    await playground.variable.revealToggle.click();
    await expect(playground.variable.value).toHaveText('typed-secret');
  });

  test('an external secret is editable and keeps its Secret scope', async ({ playground }) => {
    await playground.variable.hoverInputToken('vaultKey');

    await expect(playground.variable.scopeBadge).toHaveText('Secret');
    await expect(playground.variable.value).toHaveText('');

    await playground.variable.editTo('vault-value');

    await expect(playground.variable.value).toHaveText('*'.repeat('vault-value'.length));
  });

  // The field contains the asterisks themselves rather than the secret, so the
  // secret is never present in the page while it is hidden.
  test('the edit field holds only mask characters while the secret is hidden', async ({ playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.startEditing('typed-secret');

    const state = await playground.variable.editField.evaluate((el: HTMLTextAreaElement) => ({
      value: el.value,
      caret: el.selectionStart
    }));

    expect(state.value).toBe('*'.repeat('typed-secret'.length));
    expect(state.caret).toBe(state.value.length);
  });

  // Use key presses, not fill(): fill() replaces the whole value at once and so
  // never exercises deleting a single character through the mask.
  test('Backspace and Delete remove characters from a masked secret', async ({ playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.startEditing('abcdef');

    await playground.variable.editField.press('Backspace');
    await expect(playground.variable.editField).toHaveValue('*'.repeat(5));

    await playground.variable.editField.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0));
    await playground.variable.editField.press('Delete');
    await expect(playground.variable.editField).toHaveValue('*'.repeat(4));

    await playground.variable.editField.press('Enter');
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.revealToggle.click();

    await expect(playground.variable.value).toHaveText('bcde');
  });

  // The app confirms every copy, so a variable with nothing in it still ticks.
  test('confirms a copy even when the secret has no value yet', async ({ playground, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await playground.variable.hoverInputToken('unsetSecret');
    await expect(playground.variable.value).toHaveText('');
    await expect(playground.variable.copyButton).toBeVisible();
    await expect(playground.variable.copiedTick).toHaveCount(0);

    await playground.variable.copyButton.click();

    await expect(playground.variable.copiedTick).toBeVisible();
  });

  // The field holds asterisks, so a plain selection copy would put those on the
  // clipboard instead of the secret.
  test('copying a selection out of a masked secret yields the real value', async ({ page, playground, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.startEditing('abcdef');

    await playground.variable.editField.press('ControlOrMeta+a');
    await playground.variable.editField.press('ControlOrMeta+c');

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('abcdef');
  });

  test('cutting from a masked secret removes the real characters', async ({ page, playground, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.startEditing('abcdef');

    await playground.variable.editField.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 4));
    await playground.variable.editField.press('ControlOrMeta+x');

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('cd');
    await expect(playground.variable.editField).toHaveValue('*'.repeat(4));

    await playground.variable.editField.press('Enter');
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.revealToggle.click();

    await expect(playground.variable.value).toHaveText('abef');
  });

  test('typing into the middle of a masked secret edits the real value', async ({ playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.startEditing('abcdef');

    await playground.variable.editField.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(3, 3));
    await playground.variable.editField.pressSequentially('XY');
    await playground.variable.editField.press('Enter');

    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.revealToggle.click();

    await expect(playground.variable.value).toHaveText('abcXYdef');
  });

  test('a typed secret stays masked in the card until revealed', async ({ playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.editTo('typed-secret');

    await expect(playground.variable.card).not.toContainText('typed-secret');

    await playground.variable.revealToggle.click();

    await expect(playground.variable.card).toContainText('typed-secret');

    await playground.variable.revealToggle.click();

    await expect(playground.variable.card).not.toContainText('typed-secret');
    await expect(playground.variable.value).toHaveText('*'.repeat('typed-secret'.length));
  });

  // A secret nobody filled in has no value to send, so the request keeps the
  // `{{name}}` reference instead of quietly sending an empty value. Environment
  // secrets and external secrets behave the same way here.
  test('leaves an unfilled secret unresolved in the request', async ({ page, responsePane }) => {
    const sent: string[] = [];
    await page.route('**/customers/**', (route) => {
      sent.push(route.request().url());
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' });
    });

    await responsePane.send();

    await expect.poll(() => sent.length).toBeGreaterThan(0);
    expect(sent[0]).toContain('s={{unsetSecret}}');
    expect(sent[0]).toContain('k={{vaultKey}}');
  });

  test('sends a typed secret with the request', async ({ page, playground, responsePane }) => {
    const sent: string[] = [];
    await page.route('**/customers/**', (route) => {
      sent.push(route.request().url());
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' });
    });

    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.editTo('typed-secret');

    await expect(playground.variable.value).toHaveText('*'.repeat('typed-secret'.length));

    // A card is already open from the edit above, so the hover helper's wait for
    // a visible card returns immediately. Wait for the name to change before
    // editing, or the edit lands on the previous variable.
    await playground.variable.hoverInputToken('vaultKey');
    await expect(playground.variable.name).toHaveText('vaultKey');
    await playground.variable.editTo('vault-value');
    await expect(playground.variable.value).toHaveText('*'.repeat('vault-value'.length));

    await responsePane.send();

    await expect.poll(() => sent.length).toBeGreaterThan(0);
    expect(sent[0]).toContain('s=typed-secret');
    expect(sent[0]).toContain('k=vault-value');
  });
});

test.describe('Playground variables: undefined variable in the URL', () => {
  test('shows "Variable not found" instead of sending when "No environment" leaves {{host}} undefined', async ({ playground, responsePane }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.envSwitcher.selectEnvironment('~no-environment');

    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Variable not found');
    await expect(responsePane.errorMessage).toContainText('{{host}} is not defined');
  });
});
