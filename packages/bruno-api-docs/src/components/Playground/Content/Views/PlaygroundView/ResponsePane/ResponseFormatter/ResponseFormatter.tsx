import type { FC } from 'react';
import MenuDropdown, { type MenuDropdownItem, type MenuDropdownItems } from '../../../../../../../ui/MenuDropdown';
import {
  ResponseBodyFormat,
  STRUCTURED_FORMAT_OPTIONS,
  BYTE_FORMAT_OPTIONS,
  ALL_FORMAT_OPTIONS
} from '../../../../../../../utils/response';

interface ResponseFormatSelectorProps {
  handleSelection?: (value: ResponseBodyFormat) => void;
  selectedFormat?: ResponseBodyFormat;
  /** Formats offered for the current body; structured formats are dropped for binary responses. */
  allowedFormats?: ResponseBodyFormat[];
  /** Whether the response is shown as a rendered preview vs the raw editor. */
  showPreview?: boolean;
  /** Called when the preview toggle is flipped. */
  onPreviewToggle?: (next: boolean) => void;
}

/** "Preview" label + switch rendered as the dropdown header (above the formats). */
const PreviewToggleHeader: FC<{ checked: boolean; onChange: (next: boolean) => void }> = ({
  checked,
  onChange
}) => (
  <div className="flex items-center justify-between" style={{ padding: '4px 4px', gap: 24, minWidth: 190 }}>
    <span style={{ fontSize: 13, color: 'var(--oc-text)' }}>Preview</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle preview"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 34,
        height: 18,
        flexShrink: 0,
        padding: 0,
        border: 'none',
        borderRadius: 9,
        cursor: 'pointer',
        background: checked ? 'var(--oc-accents-primary)' : 'var(--oc-background-surface2)',
        transition: 'background 0.15s ease'
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--oc-background-base)',
          transition: 'left 0.15s ease'
        }}
      />
    </button>
  </div>
);

const FORMAT_LABELS: Record<ResponseBodyFormat, string> = {
  json: 'JSON',
  html: 'HTML',
  xml: 'XML',
  javascript: 'Javascript',
  raw: 'Raw',
  hex: 'Hex',
  base64: 'Base64'
};

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
