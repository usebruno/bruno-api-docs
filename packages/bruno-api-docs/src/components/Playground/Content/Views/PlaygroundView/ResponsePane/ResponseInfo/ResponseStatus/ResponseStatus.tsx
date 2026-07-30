import React from 'react';
import { getStatusColor } from '@/utils/response';

interface ResponseStatusProps {
  status: number | null | undefined;
  statusText: string | null | undefined;
}

const ResponseStatus: React.FC<ResponseStatusProps> = ({ status, statusText }) => {
  if (status == null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono font-medium"
        style={{
          color: getStatusColor(status)
        }}
      >
        {status} {statusText}
      </span>
    </div>
  );
};

export default ResponseStatus;
