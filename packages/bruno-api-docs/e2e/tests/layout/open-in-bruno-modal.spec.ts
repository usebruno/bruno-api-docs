import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { test, expect } from '../../playwright';

test.use({ colorScheme: 'light' });

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 800 };
const NO_GIT_URL = '/?nogit=1';

const SOURCE_ONLY_LINE = 'opencollection: "1.0.0"';

test.describe('Open in Bruno — non-git collection', () => {
  test('CTA renders as a button without a Fetch-in-Bruno link', async ({ page, pageHeader }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(NO_GIT_URL);

    await expect(pageHeader.openInBruno).toBeVisible();
    await expect(pageHeader.openInBruno).not.toHaveAttribute('href', /.*/);
    await expect(pageHeader.openInBruno).toHaveAttribute('type', 'button');
  });

  test('clicking the CTA opens the dialog with the import steps and the Download Bruno link', async ({ page, pageHeader, openInBrunoModal }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(NO_GIT_URL);
    await pageHeader.openInBruno.click();

    await expect(openInBrunoModal.root).toBeVisible();
    await expect(openInBrunoModal.title).toContainText('Open in Bruno');
    await expect(openInBrunoModal.downloadCollection).toBeVisible();

    await expect(openInBrunoModal.step1).toContainText('Import Collection');
    await expect(openInBrunoModal.filename).toHaveText('Bruno Testbench.yml');
    await expect(openInBrunoModal.step2).toContainText('click Import');
    await expect(openInBrunoModal.step3).toHaveCount(0);

    await expect(openInBrunoModal.downloadBruno).toHaveAttribute('href', 'https://www.usebruno.com/downloads');
    await expect(openInBrunoModal.downloadBruno).toHaveAttribute('target', '_blank');
    await expect(openInBrunoModal.downloadBruno).toHaveAttribute('rel', /noopener/);
  });

  test('Download Collection saves the original OpenCollection YAML', async ({ page, pageHeader, openInBrunoModal }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(NO_GIT_URL);
    await pageHeader.openInBruno.click();

    const downloadPromise = page.waitForEvent('download');
    await openInBrunoModal.downloadCollection.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Bruno Testbench.yml');

    const downloadedFilePath = await download.path();
    const text = await readFile(downloadedFilePath, 'utf8');
    expect(text).toContain(SOURCE_ONLY_LINE);

    const parsed = load(text) as { opencollection: string; info: { name: string }; items: unknown[] };
    expect(parsed.opencollection).toBe('1.0.0');
    expect(parsed.info.name).toBe('Bruno Testbench');
    expect(parsed.items.length).toBeGreaterThan(0);
  });

  test('Escape, the close button and a backdrop click each dismiss the dialog', async ({ page, pageHeader, openInBrunoModal }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(NO_GIT_URL);

    await pageHeader.openInBruno.click();
    await expect(openInBrunoModal.root).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(openInBrunoModal.root).toHaveCount(0);

    await pageHeader.openInBruno.click();
    await expect(openInBrunoModal.root).toBeVisible();
    await openInBrunoModal.closeButton.click();
    await expect(openInBrunoModal.root).toHaveCount(0);

    await pageHeader.openInBruno.click();
    await expect(openInBrunoModal.root).toBeVisible();
    await openInBrunoModal.clickBackdrop();
    await expect(openInBrunoModal.root).toHaveCount(0);
  });

  test('mobile glyph CTA still opens the dialog', async ({ page, pageHeader, openInBrunoModal }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(NO_GIT_URL);

    await expect(pageHeader.openInBruno).toHaveAccessibleName('Open in Bruno');
    await expect(pageHeader.openInBruno).toHaveText('');

    await pageHeader.openInBruno.click();
    await expect(openInBrunoModal.root).toBeVisible();
  });
});
