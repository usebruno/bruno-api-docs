import React, { useEffect, useState } from 'react';

interface StopWatchProps {
  startTime: number | null;
  testId?: string;
}

const TICK_INTERVAL_MS = 100;
const SHOW_AFTER_MS = 250;

export const StopWatch: React.FC<StopWatchProps> = ({ startTime, testId }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [startTime]);

  const elapsed = startTime ? now - startTime : 0;

  return (
    <span className="stopwatch" data-testid={testId}>
      {elapsed < SHOW_AFTER_MS ? 'Loading...' : `${(elapsed / 1000).toFixed(1)}s`}
    </span>
  );
};

export default StopWatch;
