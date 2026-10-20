import React, { useEffect, useState } from 'react';

interface StopWatchProps {
  startTime: number | null;
}

const TICK_INTERVAL = 100;
const SHOW_AFTER_MS = 250;

const StopWatch: React.FC<StopWatchProps> = ({ startTime }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => setNow(Date.now()), TICK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [startTime]);

  const elapsed = startTime ? now - startTime : 0;

  return (
    <span className="stopwatch" data-testid="response-stopwatch">
      {elapsed < SHOW_AFTER_MS ? 'Loading...' : `${(elapsed / 1000).toFixed(1)}s`}
    </span>
  );
};

export default StopWatch;
