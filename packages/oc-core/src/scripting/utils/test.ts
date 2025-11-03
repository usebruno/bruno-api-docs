import { nanoid } from "nanoid";

interface TestResult {
  uid?: string;
  status: 'pass' | 'fail' | 'skip';
  description: string;
  expected?: any;
  actual?: any;
  error?: string;
}

interface AssertionResult {
  status: 'pass' | 'fail' | 'skip';
  lhsExpr?: string;
  rhsExpr?: string;
  operator?: string;
  rhsOperand?: any;
  error?: string;
}

class TestResults {
  private results: TestResult[] = [];

  constructor() {}

  addResult(result: TestResult): void {
    result.uid = nanoid();
    this.results.push(result);
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

// Calculate summary statistics for test results
const getResultsSummary = (results: (TestResult | AssertionResult)[]): TestSummary => {
  const summary: TestSummary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  results.forEach((r) => {
    const passed = r.status === 'pass';
    if (passed) summary.passed += 1;
    else if (r.status === 'fail') summary.failed += 1;
    else summary.skipped += 1;
  });

  return summary;
};

interface BruTestResultMethods {
  __brunoTestResults: TestResults;
  test: (description: string, callback: () => Promise<void> | void) => Promise<void>;
}

const createBruTestResultMethods = (bru: any, assertionResults: AssertionResult[], chai: any): BruTestResultMethods => {
  const __brunoTestResults = new TestResults();
  const test = Test(__brunoTestResults, chai);
  setupBruTestMethods(bru, __brunoTestResults, assertionResults);

  return { __brunoTestResults, test };
};

interface TestResultsResponse {
  summary: TestSummary;
  results: Array<{
    status: string;
    description: string;
    expected?: any;
    actual?: any;
    error?: string;
  }>;
}

interface AssertionResultsResponse {
  summary: TestSummary;
  results: Array<{
    status: string;
    lhsExpr?: string;
    rhsExpr?: string;
    operator?: string;
    rhsOperand?: any;
    error?: string;
  }>;
}

const setupBruTestMethods = (bru: any, __brunoTestResults: TestResults, assertionResults: AssertionResult[]) => {
  const getTestResults = async (): Promise<TestResultsResponse> => {
    const results = __brunoTestResults.getResults();
    const summary = getResultsSummary(results);
    return {
      summary,
      results: results.map(r => ({
        status: r.status,
        description: r.description,
        expected: r.expected,
        actual: r.actual,
        error: r.error
      }))
    };
  };

  const getAssertionResults = async (): Promise<AssertionResultsResponse> => {
    const results = assertionResults;
    const summary = getResultsSummary(results);
    return {
      summary,
      results: results.map(r => ({
        status: r.status,
        lhsExpr: r.lhsExpr,
        rhsExpr: r.rhsExpr,
        operator: r.operator,
        rhsOperand: r.rhsOperand,
        error: r.error
      }))
    };
  };

  // Set methods on bru object if provided
  if (bru) {
    bru.getTestResults = getTestResults;
    bru.getAssertionResults = getAssertionResults;
  }

  // Also return the methods for direct use
  return {
    getTestResults,
    getAssertionResults
  };
};

const Test = (__brunoTestResults: TestResults, chai: any) => async (description: string, callback: () => Promise<void> | void): Promise<void> => {
  try {
    await callback();
    __brunoTestResults.addResult({ description, status: 'pass' });
  } catch (error: any) {
    if (error instanceof chai.AssertionError) {
      const { message, actual, expected } = error;
      __brunoTestResults.addResult({
        description,
        status: 'fail',
        error: message,
        actual,
        expected
      });
    } else {
      __brunoTestResults.addResult({
        description,
        status: 'fail',
        error: error?.message || 'An unexpected error occurred.'
      });
    }
  }
};

export {
  createBruTestResultMethods,
  type TestResult,
  type AssertionResult,
  type TestSummary,
  type BruTestResultMethods,
  type TestResultsResponse,
  type AssertionResultsResponse
};