import React from 'react';

const MB = 1024 * 1024;
const KB = 1024;
interface ResponseSizeProps {
  size: number | null | undefined;
}

const ResponseSize: React.FC<ResponseSizeProps> = ({ size }) => {
  if (size == null) {
    return null;
  }

  const sizeToDisplay = (
    size > MB
      ? `${(size / MB).toFixed(2)} MB`
      : size > KB
        ? `${(size / KB).toFixed(2)} KB`
        : `${size}B`
  );

  return (
    <div className="font-mono" style={{ color: 'var(--text-primary)' }}>
      {sizeToDisplay}
    </div>
  );
};

export default ResponseSize;
