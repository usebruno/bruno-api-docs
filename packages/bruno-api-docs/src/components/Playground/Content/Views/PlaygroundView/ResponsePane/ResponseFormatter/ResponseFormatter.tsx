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
import { IconEye } from '@tabler/icons';

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

  const SelectedFormatIcon = FORMAT_ICONS[selectedFormat as ResponseBodyFormat];

  // Determine the prefix icon - eye icon when in preview mode, format icon otherwise
  const getFormatIcon = () => {
    if (showPreview) {
      return <IconEye size={14} strokeWidth={2} />;
    }
    if (SelectedFormatIcon) {
      return <SelectedFormatIcon size={14} strokeWidth={1.5} />;
    }
    return null;
  };

  return (
    <MenuDropdown
      items={items}
      selectedItemId={selectedFormat}
      itemToText={(item: MenuDropdownItem) => (
        <div>
          <span>{getFormatIcon()}</span>
          <span>{item.label}</span>
        </div>
      )}
      placement="bottom-start"
      header={<PreviewToggleHeader checked={showPreview} onChange={toggleView} />}
      testId="response-format-selector"
    />
  );
};

export default ResponseFormatSelector;
