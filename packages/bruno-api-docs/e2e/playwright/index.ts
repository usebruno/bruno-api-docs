import { mergeTests } from '@playwright/test';
import { test as pagesTest } from './pages.fixture';
import { test as digestMockTest } from './digest-mock.fixture';

/**
 * Entry point for the test harness — specs import everything (`test`, `expect`)
 * from here.
 *
 * `mergeTests` combines the fixtures from every `*.fixture.ts` file in this folder
 * into one `test`.
 */
export const test = mergeTests(pagesTest, digestMockTest);
export { expect } from '@playwright/test';
