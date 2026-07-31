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
    <div
      className="font-mono font-medium"
      style={{
        color: getStatusColor(status)
      }}
    >
      {status} {statusText}
    </div>
  );
};

export default ResponseStatus;
