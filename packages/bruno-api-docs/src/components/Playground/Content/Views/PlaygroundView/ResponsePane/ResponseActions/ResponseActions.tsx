import React, { useCallback } from 'react';
import {
  IconCopy,
  IconDownload,
  IconEraser,
  IconLayoutColumns,
  IconLayoutRows,
  IconDots
} from '@tabler/icons';
import CopyResponse from './CopyResponse/CopyResponse';
import ClearResponse from './ClearResponse/ClearResponse';
import DownloadResponse from './DownloadResponse/DownloadResponse';
import ChangeLayout from './ChangeLayout/ChangeLayout';
import { StyledWrapper } from './StyledWrapper';
import MenuDropdown from '@/ui/MenuDropdown';
import type { MenuDropdownItem } from '@/ui/MenuDropdown';
import IconButton from '@/ui/IconButton/IconButton';
import type { RunRequestResponse } from '@/runner';
import type { ResponseBodyFormat } from '@/constants';
import { useAppDispatch } from '@/store/hooks';
import { clearPlaygroundResponse, setResponsePaneOrientation } from '@/store/slices/playground';
import { downloadResponse } from '@/utils/downloadResponse';
import useCopy from '@/hooks/useCopy';
import { formatResponse } from '@/utils/dataFormatter';

interface ResponseActionsProps {
  orientation: 'vertical' | 'horizontal';
  itemUuid: string;
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
}

const ResponseActions: React.FC<ResponseActionsProps> = ({
  orientation,
  itemUuid,
  response,
  selectedFormat,
  showPreview
}) => {
  const getCopyText = useCallback((
  ): string => {
    const data = response?.data;
    const dataBuffer = response?.base64Data;
    // Preview shows the raw data, so copy that as-is.
    if (showPreview) {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
    if (selectedFormat && data && dataBuffer) {
      return formatResponse(data, dataBuffer, selectedFormat);
    }
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }, [
    response?.data,
    response?.base64Data,
    selectedFormat,
    showPreview
  ]);
  const copyDisabled = !response.data;
  const { copied, copyResponse } = useCopy({
    getText: getCopyText,
    disabled: copyDisabled
  });
  const dispatch = useAppDispatch();

  const downloadDisabled = !response?.base64Data;
  const onDownload = () => downloadResponse(response);
  const onClear = () => dispatch(clearPlaygroundResponse(itemUuid));
  const onToggleLayout = () =>
    dispatch(setResponsePaneOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal'));

  const menuItems: MenuDropdownItem[] = [
    { id: 'copy', label: 'Copy Response', leftSection: IconCopy, disabled: copyDisabled, onClick: copyResponse },
    { id: 'download', label: 'Download Response', leftSection: IconDownload, disabled: downloadDisabled, onClick: onDownload },
    { id: 'clear', label: 'Clear Response', leftSection: IconEraser, onClick: onClear },
    {
      id: 'layout',
      label: 'Change Layout',
      leftSection: orientation === 'vertical' ? IconLayoutColumns : IconLayoutRows,
      onClick: onToggleLayout
    }
  ];

  return (
    <StyledWrapper className="response-pane-actions-wrapper" data-testid="response-pane-actions-wrapper">
      <div className="actions-dropdown" data-testid="actions-dropdown">
        <MenuDropdown items={menuItems} placement="bottom-end" testId="response-actions-menu">
          <IconButton label="More actions" showTooltip={false} className="p-1">
            <IconDots size={13} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
          </IconButton>
        </MenuDropdown>
      </div>
      <div className="actions-buttons" data-testid="actions-buttons">
        <CopyResponse copied={copied} onClick={copyResponse} disabled={copyDisabled} />
        <DownloadResponse onClick={onDownload} disabled={downloadDisabled} />
        <ClearResponse onClick={onClear} />
        <ChangeLayout orientation={orientation} handleChangeLayout={onToggleLayout} />
      </div>
    </StyledWrapper>
  );
};

export default ResponseActions;
