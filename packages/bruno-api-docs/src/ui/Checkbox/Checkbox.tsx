import type { ChangeEvent } from 'react';
import React from 'react';
import { StyledWrapper } from './StyledWrapper';
import { CheckIcon } from '@/assets/icons';

interface CheckboxProps {
  className?: string;
  checked: boolean;
  ariaLabel: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  testId?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  className,
  checked,
  ariaLabel,
  onChange,
  disabled = false,
  testId
}) => {
  return (
    <StyledWrapper className={className} data-testid={testId}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={ariaLabel}
        onChange={onChange}
        disabled={disabled}
        data-testid={testId && `${testId}-input`}
      />
      <CheckIcon className="checkbox-check" width={12} height={12} />
    </StyledWrapper>
  );
};

export default Checkbox;
