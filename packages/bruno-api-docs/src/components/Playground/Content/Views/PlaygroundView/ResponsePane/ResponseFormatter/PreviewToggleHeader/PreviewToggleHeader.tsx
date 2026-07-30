import React from 'react';
import { StyledWrapper } from './StyledWrapper';

const PreviewToggleHeader: React.FC<{ checked: boolean; onChange: () => void }> = ({
  checked,
  onChange
}) => (
  <StyledWrapper>
    <span className="preview-toggle-label">Preview</span>
    <button
      type="button"
      role="switch"
      className="preview-toggle"
      aria-checked={checked}
      aria-label="Toggle preview"
      onClick={onChange}
    >
      <span className="preview-toggle-knob" />
    </button>
  </StyledWrapper>
);

export default PreviewToggleHeader;
