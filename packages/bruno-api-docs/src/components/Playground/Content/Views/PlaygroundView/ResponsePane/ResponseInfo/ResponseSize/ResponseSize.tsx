import React from 'react';

interface ResponseSizeProps {
  size: number | null | undefined;
}
const ResponseSize: React.FC<ResponseSizeProps> = ({ size }) => {
  if (size == null) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
        {(size / 1024).toFixed(2)} KB
      </span>
    </div>
  );
};

export default ResponseSize;
