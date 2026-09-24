import React, { useCallback, useRef, useState } from 'react';
import { StyledWrapper } from './StyledWrapper';

interface PromptVariablesModalProps {
  open: boolean;
  names: string[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export const PromptVariablesModal: React.FC<PromptVariablesModalProps> = ({
  open,
  names,
  onSubmit,
  onCancel
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSubmit(values);
    },
    [values, onSubmit]
  );

  if (!names.length) return null;

  return (
    <StyledWrapper
      open={open}
      onClose={onCancel}
      title={<span className="prompt-variables-title" data-testid="prompt-variables-title">Input Required</span>}
      ariaLabel="Input Required"
      initialFocusRef={firstFieldRef}
    >
      <form onSubmit={handleSubmit}>
        <div className="prompt-variables-body" data-testid="prompt-variables-modal-content">
          <div className="prompt-variables-fields">
            {names.map((name, index) => (
              <div key={name} data-testid="prompt-variable-input-container">
                <label
                  htmlFor={`prompt-${index}`}
                  className="prompt-variable-label"
                  data-testid={`prompt-variable-label-${index}`}
                >
                  {name}
                </label>
                <input
                  id={`prompt-${index}`}
                  ref={index === 0 ? firstFieldRef : undefined}
                  type="text"
                  className="prompt-variable-input"
                  data-testid={`prompt-variable-input-${index}`}
                  placeholder="Enter value"
                  value={values[name] || ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="prompt-variables-footer">
          <button
            type="button"
            className="prompt-variables-cancel"
            data-testid="prompt-variables-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="prompt-variables-submit" data-testid="prompt-variables-submit">
            Continue
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default PromptVariablesModal;
