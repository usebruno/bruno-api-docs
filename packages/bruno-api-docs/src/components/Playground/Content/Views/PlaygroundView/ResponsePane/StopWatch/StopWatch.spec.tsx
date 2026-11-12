import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId } from '@/test-utils/dom';
import { StopWatch } from './StopWatch';

const NOW = 1_700_000_000_000;

const stopWatch = (startTime: number | null) => <StopWatch startTime={startTime} testId="stopwatch" />;

describe('StopWatch', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "Loading..." for the first 250ms so quick requests do not flash a timer', () => {
    expect(getByTestId(useRenderToDom(stopWatch(NOW)), 'stopwatch').text).toBe('Loading...');
    expect(getByTestId(useRenderToDom(stopWatch(NOW - 249)), 'stopwatch').text).toBe('Loading...');
  });

  it('shows the elapsed time in seconds with one decimal after the first 250ms', () => {
    expect(getByTestId(useRenderToDom(stopWatch(NOW - 400)), 'stopwatch').text).toBe('0.4s');
    expect(getByTestId(useRenderToDom(stopWatch(NOW - 1500)), 'stopwatch').text).toBe('1.5s');
    expect(getByTestId(useRenderToDom(stopWatch(NOW - 61_240)), 'stopwatch').text).toBe('61.2s');
  });
});
