import type { FC } from 'react';
import MenuDropdown, { type MenuDropdownItem, type MenuDropdownItems } from '../../../../../../../ui/MenuDropdown';
import type {
  ResponseBodyFormat } from '../../../../../../../constants';
import {
  STRUCTURED_FORMAT_OPTIONS,
  BYTE_FORMAT_OPTIONS,
  ALL_FORMAT_OPTIONS,
  FORMAT_LABELS
} from '../../../../../../../constants';
import { StyledWrapper } from './StyledWrapper';

interface ResponseFormatSelectorProps {
  handleSelection?: (value: ResponseBodyFormat) => void;
  selectedFormat?: ResponseBodyFormat;
  /** Formats offered for the current body; structured formats are dropped for binary responses. */
  allowedFormats?: ResponseBodyFormat[];
  /** Whether the response is shown as a rendered preview vs the raw editor. */
  showPreview?: boolean;
  onPreviewToggle?: (next: boolean) => void;
}

const PreviewToggleHeader: FC<{ checked: boolean; onChange: (next: boolean) => void }> = ({
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
      onClick={() => onChange(!checked)}
    >
      <span className="preview-toggle-knob" />
    </button>
  </StyledWrapper>
);

const ResponseFormatSelector: FC<ResponseFormatSelectorProps> = ({
  handleSelection,
  selectedFormat,
  allowedFormats = ALL_FORMAT_OPTIONS,
  showPreview = false,
  onPreviewToggle
}) => {
  // Preserve the two-group visual layout, but drop a group entirely when none of its
  // formats are allowed (binary responses collapse to the byte-format group only).
  const groups = [STRUCTURED_FORMAT_OPTIONS, BYTE_FORMAT_OPTIONS]
    .map((group) => group.filter((format) => allowedFormats.includes(format)))
    .filter((group) => group.length > 0);

  const items: MenuDropdownItems = groups.map((group) => ({
    options: group.map((format) => ({
      id: format,
      label: FORMAT_LABELS[format],
      onClick: () => handleSelection?.(format)
    }))
  }));

  return (
    <MenuDropdown
      items={items}
      selectedItemId={selectedFormat}
      itemToText={(item: MenuDropdownItem) => item.label}
      placement="bottom-start"
      header={<PreviewToggleHeader checked={showPreview} onChange={(next) => onPreviewToggle?.(next)} />}
      testId="response-format-selector"
    />
  );
};

export default ResponseFormatSelector;
