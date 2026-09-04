import { describe, it, expect } from 'vitest';
import { appendScriptErrorResult } from './script-errors';

describe('appendScriptErrorResult', () => {
  it('adds a failed "Test Script Error" row after the tests that ran before the script threw', () => {
    const partial = {
      summary: { total: 1, passed: 1, failed: 0, skipped: 0 },
      results: [{ status: 'pass', description: 'first' }]
    };
    const result = appendScriptErrorResult(partial, 'tests', 'Cannot find module fs');
    expect(result.results).toEqual([
      { status: 'pass', description: 'first' },
      { status: 'fail', description: 'Test Script Error', error: 'Cannot find module fs' }
    ]);
    expect(result.summary).toEqual({ total: 2, passed: 1, failed: 1, skipped: 0 });
  });

  it('starts a fresh result set when no test ran before the post-response script threw', () => {
    const result = appendScriptErrorResult(undefined, 'post-response', 'Network Error');
    expect(result.results).toEqual([
      { status: 'fail', description: 'Post-Response Script Error', error: 'Network Error' }
    ]);
    expect(result.summary).toEqual({ total: 1, passed: 0, failed: 1, skipped: 0 });
  });

  it('does not mutate the results it was given', () => {
    const partial = { summary: { total: 0, passed: 0, failed: 0, skipped: 0 }, results: [] };
    appendScriptErrorResult(partial, 'tests', 'boom');
    expect(partial.results).toEqual([]);
  });
});
