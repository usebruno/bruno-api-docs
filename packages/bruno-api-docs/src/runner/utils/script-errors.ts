import type { TestResultsResponse } from '@/scripting/utils/test';

export type ScriptErrorPhase = 'pre-request' | 'post-response' | 'tests';

export interface ScriptError {
  phase: Exclude<ScriptErrorPhase, 'pre-request'>;
  message: string;
}

export const SCRIPT_ERROR_TITLES: Record<ScriptErrorPhase, string> = {
  'pre-request': 'Pre-Request Script Error',
  'post-response': 'Post-Response Script Error',
  'tests': 'Test Script Error'
};

const EMPTY_SUMMARY = { total: 0, passed: 0, failed: 0, skipped: 0 };

export const appendScriptErrorResult = (
  testResults: TestResultsResponse | undefined,
  phase: ScriptErrorPhase,
  message: string
): TestResultsResponse => {
  const summary = testResults?.summary ?? EMPTY_SUMMARY;
  return {
    summary: { ...summary, total: summary.total + 1, failed: summary.failed + 1 },
    results: [
      ...(testResults?.results ?? []),
      { status: 'fail', description: SCRIPT_ERROR_TITLES[phase], error: message }
    ]
  };
};
