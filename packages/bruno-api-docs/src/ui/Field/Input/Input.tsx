import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';
import cx from '@/utils/cx';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  secret?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  testId?: string;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  id,
  secret = false,
  readOnly = false,
  placeholder,
  testId
}) => {
  const [revealed, setRevealed] = useState(false);
  const resolvedType = secret ? (revealed ? 'text' : 'password') : 'text';

  return (
    <StyledWrapper
      className={cx([
        'oc-input-wrapper',
        {
          'oc-input-wrapper--secret': secret,
          'oc-input-wrapper--readonly': readOnly
        }
      ])}
      data-testid={testId ? `${testId}-wrapper` : undefined}
    >
      <input
        id={id}
        type={resolvedType}
        className="oc-input"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        data-testid={testId}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {secret && (
        <button
          type="button"
          className="oc-input-toggle"
          aria-label={revealed ? 'Hide value' : 'Show value'}
          aria-pressed={revealed}
          data-testid={testId ? `${testId}-toggle` : undefined}
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </StyledWrapper>
  );
};

export default Input;
