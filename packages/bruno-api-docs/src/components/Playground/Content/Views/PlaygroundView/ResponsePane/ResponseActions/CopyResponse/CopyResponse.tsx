import React from 'react';
import {IconCheck, IconCopy} from '@tabler/icons';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { RunRequestResponse } from '../../../../../../../../runner';
import { ResponseBodyFormat } from '../../../../../../../../constants';
import { useCopyResponse } from './hooks/useCopyResponse';

interface CopyResponseProps {
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
}

const CopyResponse: React.FC<CopyResponseProps> = ({ response, selectedFormat, showPreview }) => {
  const { copied, copyResponse, disabled } = useCopyResponse(response, selectedFormat, showPreview);
  return (
    <ActionIcon label="Copy Response" className="p-1" disabled={disabled} onClick={copyResponse}>
      {copied ? <IconCheck size={16} stroke={2} /> : <IconCopy size={16} stroke={2} />}
    </ActionIcon>
  );
}

export default CopyResponse;
