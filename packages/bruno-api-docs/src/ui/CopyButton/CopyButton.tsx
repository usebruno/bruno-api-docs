import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyledWrapper } from './StyledWrapper';
import { IconCheck, IconCopy } from '@tabler/icons';
import useCopy from '@/hooks/useCopy';
import cx from '@/utils/cx';

interface CopyButtonProps {
  text?: string;
  getText?: () => string;
  label?: string;
  copiedLabel?: string;
  resetAfterMs?: number;
  testId?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  getText,
  label = 'Copy',
  copiedLabel = 'Copied',
  resetAfterMs = 2000,
  testId = 'copy-button',
  style,
  className
}) => {
  const { copied, copyResponse } = useCopy({
    text,
    getText,
    resetAfterMs
  });

  return (
    <StyledWrapper
      type="button"
      className={cx('copy-button', className)}
      onClick={copyResponse}
      aria-label={copied ? copiedLabel : label}
      data-testid={testId}
      style={style}
    >
      {copied ? <IconCheck size={16} strokeWidth={1} /> : <IconCopy size={16} strokeWidth={1} />}
    </StyledWrapper>
  );
};

export default CopyButton;
