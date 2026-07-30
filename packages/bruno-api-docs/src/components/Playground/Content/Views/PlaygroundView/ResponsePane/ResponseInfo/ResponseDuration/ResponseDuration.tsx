import React from 'react';

interface ResponseDurationProps {
  duration: number | null | undefined;
}

const ResponseDuration: React.FC<ResponseDurationProps> = ({ duration }) => {
  if (duration == null) {
    return null;
  };

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
        {duration}ms
      </span>
    </div>
  );
};

export default ResponseDuration;
