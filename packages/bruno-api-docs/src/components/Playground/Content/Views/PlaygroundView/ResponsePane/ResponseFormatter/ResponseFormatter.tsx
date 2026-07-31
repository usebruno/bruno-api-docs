import { IconEye } from '@tabler/icons';
import MenuDropdown, { type MenuDropdownItem, type MenuDropdownItems } from '@/ui/MenuDropdown';
import type {
  ResponseBodyFormat } from '@/constants';
import {
  STRUCTURED_FORMAT_OPTIONS,
  BYTE_FORMAT_OPTIONS,
  ALL_FORMAT_OPTIONS,
  FORMAT_LABELS,
  FORMAT_ICONS
} from '@/constants';
import PreviewToggleHeader from './PreviewToggleHeader/PreviewToggleHeader';

interface ResponseFormatSelectorProps {
  handleSelection?: (value: ResponseBodyFormat) => void;
  selectedFormat?: ResponseBodyFormat;
  /** Formats offered for the current body; structured formats are dropped for binary responses. */
  allowedFormats?: ResponseBodyFormat[];
  /** Whether the response is shown as a rendered preview vs the raw editor. */
  showPreview?: boolean;
  toggleView: () => void;
}

const ResponseFormatSelector: React.FC<ResponseFormatSelectorProps> = ({
  handleSelection,
  selectedFormat,
  allowedFormats = ALL_FORMAT_OPTIONS,
  showPreview = false,
  toggleView
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
      onClick: () => handleSelection?.(format),
      leftSection: FORMAT_ICONS[format]
    }))
  }));

  const TriggerIcon = showPreview ? IconEye : selectedFormat ? FORMAT_ICONS[selectedFormat] : undefined;

  return (
    <MenuDropdown
      items={items}
      selectedItemId={selectedFormat}
      itemToText={(item: MenuDropdownItem) => (
        <span className="inline-flex items-center gap-1.5">
          {TriggerIcon && (
            <TriggerIcon size={14} stroke={1.5} aria-hidden data-testid="response-format-selector-trigger-icon" />
          )}
          {item.label}
        </span>
      )}
      placement="bottom-start"
      header={<PreviewToggleHeader checked={showPreview} onChange={toggleView} />}
      testId="response-format-selector"
    />
  );
};

export default ResponseFormatSelector;
