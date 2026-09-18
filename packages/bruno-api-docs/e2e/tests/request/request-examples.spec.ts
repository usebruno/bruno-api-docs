import { test, expect } from '../../playwright';

const GET_ALL_CUSTOMERS = ['billing', 'customers', 'Get All Customers'];
const OK_EXAMPLE = '200 OK - first page';
const BAD_REQUEST_EXAMPLE = '400 Bad Request - invalid per_page';
const SNIPPET_LANGUAGES = ['curl', 'javascript', 'python'] as const;
const VARS_REQUEST = '/?fixture=vars#/customers/variables-demo';
const VARS_EXAMPLE = '200 OK';

test.describe('Request page — Examples', () => {
  test.beforeEach(async ({ requestPage }) => {
    await requestPage.open(GET_ALL_CUSTOMERS);
  });

  test('lists every saved example', async ({ requestPage }) => {
    const { examples } = requestPage;
    await expect(examples.root).toBeVisible();
    await expect(examples.items).toHaveCount(2);
    await expect(examples.example(OK_EXAMPLE)).toBeVisible();
    await expect(examples.example(BAD_REQUEST_EXAMPLE)).toBeVisible();
  });

  test('shows the status code of each example', async ({ requestPage }) => {
    const { examples } = requestPage;
    await expect(examples.statusCode(OK_EXAMPLE)).toHaveText('200');
    await expect(examples.statusCode(BAD_REQUEST_EXAMPLE)).toHaveText('400');
  });

  test('an example code snippet carries the request\'s resolved auth', async ({ requestPage }) => {
    const { examples } = requestPage;
    await examples.openSnippet(OK_EXAMPLE);
    await expect(examples.snippetCode).toContainText('Bearer');
  });

  test.describe('Request pane', () => {
    test('shows the query parameters by default', async ({ requestPage }) => {
      const { examples } = requestPage;
      await expect(examples.requestBody(OK_EXAMPLE)).toContainText('per_page');
      await expect(examples.requestBody(OK_EXAMPLE)).toContainText('10');
    });

    test('aligns the Query heading with its values, with padding consistent with the Headers tab', async ({
      requestPage
    }) => {
      const { examples } = requestPage;
      const card = examples.example(OK_EXAMPLE);

      const params = await card.locator('.request-params-group').first().evaluate((el) => {
        const heading = el.querySelector('.request-params-heading') as HTMLElement;
        const key = el.querySelector('.property-key') as HTMLElement;
        return {
          heading: Math.round(heading.getBoundingClientRect().left),
          key: Math.round(key.getBoundingClientRect().left)
        };
      });
      // The Query heading lines up with its own values.
      expect(params.key).toBe(params.heading);

      // ...and the values keep the same left padding as the Headers tab (consistent across sections).
      await examples.selectRequestTab(OK_EXAMPLE, 'headers');
      const headerKey = await card
        .locator('.property-row .property-key')
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().left));
      expect(headerKey).toBe(params.key);
    });

    test('switches to the Headers tab to reveal the request headers', async ({ requestPage }) => {
      const { examples } = requestPage;
      await examples.selectRequestTab(OK_EXAMPLE, 'headers');
      await expect(examples.requestBody(OK_EXAMPLE)).toContainText('Accept');
      await expect(examples.requestBody(OK_EXAMPLE)).toContainText('application/json');
    });
  });

  test.describe('Response pane', () => {
    test('shows the response body by default', async ({ requestPage }) => {
      const { examples } = requestPage;
      await expect(examples.responseBody(OK_EXAMPLE)).toContainText('cus_ABC123xyz');
      await expect(examples.responseBody(OK_EXAMPLE)).toContainText('john.smith@example.com');
    });

    test('switches to the Headers tab to reveal the response headers', async ({ requestPage }) => {
      const { examples } = requestPage;
      await examples.selectResponseTab(OK_EXAMPLE, 'headers');
      await expect(examples.responseBody(OK_EXAMPLE)).toContainText('x-total-count');
      await expect(examples.responseBody(OK_EXAMPLE)).toContainText('42');
    });
  });

  test('expands a collapsed example to reveal its response', async ({ requestPage }) => {
    const { examples } = requestPage;
    await examples.open(BAD_REQUEST_EXAMPLE);
    await expect(examples.responseBody(BAD_REQUEST_EXAMPLE)).toContainText('invalid_request');
  });

  test.describe('Code snippet', () => {
    test('offers a Code Snippet trigger on each saved example', async ({ requestPage }) => {
      const { examples } = requestPage;
      await expect(examples.snippetButton(OK_EXAMPLE)).toBeVisible();
      await expect(examples.snippetButton(OK_EXAMPLE)).toHaveText('Code Snippet');

      await examples.open(BAD_REQUEST_EXAMPLE);
      await expect(examples.snippetButton(BAD_REQUEST_EXAMPLE)).toBeVisible();
      await expect(examples.snippetButton(BAD_REQUEST_EXAMPLE)).toHaveText('Code Snippet');
    });

    test('opens a dialog with the same languages as the request page Code Snippet', async ({ requestPage }) => {
      const { examples, codeSnippet } = requestPage;
      await examples.openSnippet(OK_EXAMPLE);

      const pageLanguages = await codeSnippet.languageIds();
      const exampleLanguages = await examples.snippet.modalLanguageIds();
      expect(pageLanguages.length).toBeGreaterThan(0);
      expect(exampleLanguages).toEqual(pageLanguages);
    });

    test('shows the example request, and switches language on demand', async ({ requestPage }) => {
      const { examples } = requestPage;
      await examples.openSnippet(OK_EXAMPLE);
      await expect(examples.snippetCode).toContainText('curl');
      await expect(examples.snippetCode).toContainText('per_page=10');
      await examples.snippetLanguageTab('python').click();
      await expect(examples.snippetCode).toContainText('requests');
      await expect(examples.snippetCode).toContainText('per_page=10');
    });

    test('builds each snippet from its own example, not a shared one', async ({ requestPage }) => {
      const { examples } = requestPage;
      await examples.open(BAD_REQUEST_EXAMPLE);
      await examples.openSnippet(BAD_REQUEST_EXAMPLE);
      await expect(examples.snippetCode).toContainText('per_page=999');
      await expect(examples.snippetCode).not.toContainText('per_page=10');
    });

    test('copied snippet matches the language selected in the modal', async ({ requestPage, page }) => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      const { examples } = requestPage;
      const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
      const markers = { curl: 'curl', javascript: 'fetch', python: 'requests' } as const;

      await examples.openSnippet(OK_EXAMPLE);
      await expect(examples.snippet.modalCopyButton).toBeVisible();

      for (const language of SNIPPET_LANGUAGES) {
        await examples.snippetLanguageTab(language).click();
        await expect(examples.snippetCode).toContainText(markers[language]);
        await examples.snippet.modalCopyButton.click();
        await expect.poll(clipboard).toContain(markers[language]);
        expect(await clipboard()).toContain('per_page=10');
      }
    });

    test('renders only one dialog — the embedded snippet brings no modal of its own', async ({ requestPage, page }) => {
      const { examples } = requestPage;
      await examples.openSnippet(OK_EXAMPLE);
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(examples.snippetModal.getByTestId('example-code-snippet-expand')).toHaveCount(0);
    });

    test('dismisses on Escape and returns focus to the trigger', async ({ requestPage, page }) => {
      const { examples } = requestPage;
      await examples.openSnippet(OK_EXAMPLE);

      await page.keyboard.press('Escape');
      await expect(examples.snippetModal).toBeHidden();
      await expect(examples.snippetButton(OK_EXAMPLE)).toBeFocused();
    });

    test('dismisses on close-button click and returns focus to the trigger', async ({ requestPage }) => {
      const { examples } = requestPage;
      await examples.openSnippet(OK_EXAMPLE);

      await examples.snippetModal.getByRole('button', { name: 'Close' }).click();
      await expect(examples.snippetModal).toBeHidden();
      await expect(examples.snippetButton(OK_EXAMPLE)).toBeFocused();
    });
  });
});

test.describe('Request page — Examples (no saved examples)', () => {
  test('renders no Examples section — and no example Code Snippet button — when the request has none', async ({
    requestPage,
    page
  }) => {
    await requestPage.open(['billing', 'customers', 'Get Customers - Filter by Date Range']);

    await expect(requestPage.examples.root).toHaveCount(0);
    await expect(page.getByTestId('example-code-snippet-trigger')).toHaveCount(0);
  });
});

test.describe('Request page — Example code snippet (Show vars)', () => {
  test.beforeEach(async ({ requestPage, envSwitcher }) => {
    await requestPage.goto(VARS_REQUEST);
    await envSwitcher.selectEnvironment('Dev');
  });

  test('keeps {{var}} placeholders in the example snippet when Show vars is off', async ({
    requestPage,
    envSwitcher
  }) => {
    const { examples } = requestPage;
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');

    await examples.open(VARS_EXAMPLE);
    await examples.openSnippet(VARS_EXAMPLE);
    await expect(examples.snippetCode).toContainText('{{host}}');
    await expect(examples.snippetCode).toContainText('{{exampleOnly}}');
    await expect(examples.snippetCode).not.toContainText('https://api.dev.example.com');
  });

  test('interpolates example snippet variables when Show vars is on', async ({
    requestPage,
    envSwitcher,
    page
  }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const { examples } = requestPage;
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());

    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');

    await examples.open(VARS_EXAMPLE);
    await examples.openSnippet(VARS_EXAMPLE);
    await expect(examples.snippet.modalInterpolate).toBeChecked();
    await expect(examples.snippetCode).toContainText('https://api.dev.example.com/customers');
    await expect(examples.snippetCode).toContainText('example-value');
    await expect(examples.snippetCode).not.toContainText('{{host}}');
    await expect(examples.snippetCode).not.toContainText('{{exampleOnly}}');

    await examples.snippet.modalCopyButton.click();
    await expect.poll(clipboard).toContain('https://api.dev.example.com/customers');
    const copied = await clipboard();
    expect(copied).toContain('example-value');
    expect(copied).not.toContain('{{host}}');
    expect(copied).not.toContain('{{exampleOnly}}');
  });

  test('Interpolate Variables follows Show vars on open, and interpolates without flipping the page toggle', async ({
    requestPage,
    envSwitcher
  }) => {
    const { examples } = requestPage;
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');

    await examples.open(VARS_EXAMPLE);
    await examples.openSnippet(VARS_EXAMPLE);
    await expect(examples.snippet.modalInterpolate).not.toBeChecked();
    await expect(examples.snippetCode).toContainText('{{host}}');

    await examples.snippet.modalInterpolate.setChecked(true);
    await expect(examples.snippetCode).toContainText('https://api.dev.example.com/customers');
    await expect(examples.snippetCode).toContainText('example-value');
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');
  });
});
