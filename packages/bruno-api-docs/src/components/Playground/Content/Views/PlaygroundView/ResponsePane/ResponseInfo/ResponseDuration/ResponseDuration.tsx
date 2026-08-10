import React from 'react';

interface ResponseDurationProps {
  duration: number | null | undefined;
}

const ResponseDuration: React.FC<ResponseDurationProps> = ({ duration }) => {
  if (duration == null) {
    return null;
  };

  return (
    <div className="font-medium">
      {duration}ms
    </div>
  );
};

export default ResponseDuration;
