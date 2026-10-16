import { test, expect } from '../../playwright';

const USERS_BODY = '{"data":[{"id":1,"name":"Alice"}]}';

test.describe('Components that cannot read CSS variables follow the theme toggle', () => {
  test.use({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ playground, responsePane }) => {
    await responsePane.mockUsersResponse(USERS_BODY);
    await playground.open('bottom');
    await playground.openRequest('get users');
    await responsePane.send();
    await expect(responsePane.status).toBeVisible();
  });

  test('the code editor switches between its light and dark theme', async ({ themeToggle, responsePane }) => {
    await expect(responsePane.bodyEditorCanvas).toHaveClass(/\bvs\b/);

    await themeToggle.toggle();
    await expect(responsePane.bodyEditorCanvas).toHaveClass(/\bvs-dark\b/);

    await themeToggle.toggle();
    await expect(responsePane.bodyEditorCanvas).toHaveClass(/\bvs\b/);
  });

  test('the JSON preview switches between its light and dark theme', async ({ themeToggle, responsePane }) => {
    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    await expect(responsePane.jsonPreview).toBeVisible();
    const icon = responsePane.jsonPreview.locator('.expanded-icon svg').first();
    const colour = () => icon.evaluate((el) => getComputedStyle(el).color);

    const light = await colour();
    await themeToggle.toggle();
    await expect.poll(colour).not.toBe(light);

    await themeToggle.toggle();
    await expect.poll(colour).toBe(light);
  });
});
