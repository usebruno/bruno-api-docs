import React, { useCallback, useState } from 'react';
import type { ScriptFile } from '@opencollection/types/collection/item';
import TitleLabel from '@/components/TitleLabel/TitleLabel';
import CodeEditor from '@/ui/CodeEditor/CodeEditor';
import { useAppDispatch } from '@/store/hooks';
import { updatePlaygroundScriptFile } from '@/store/slices/playground';
import { getItemName } from '@/utils/schemaHelpers';
import { getItemUuid } from '@/utils/itemUtils';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { StyledWrapper } from './StyledWrapper';

interface ScriptFileViewProps {
  item: ScriptFile;
}

const ScriptFileView: React.FC<ScriptFileViewProps> = ({ item }) => {
  const dispatch = useAppDispatch();
  const uuid = getItemUuid(item);
  const name = getItemName(item) || 'Script';
  const [source, setSource] = useState(item.script ?? '');

  const scheduleSave = useDebouncedSave((save: { uuid: string; script: string }) => {
    dispatch(updatePlaygroundScriptFile(save));
  });

  const handleChange = useCallback((value: string) => {
    setSource(value);
    if (uuid) scheduleSave({ uuid, script: value });
  }, [scheduleSave, uuid]);

  return (
    <StyledWrapper data-testid="playground-script-file">
      <TitleLabel className="truncate mb-2 mt-5" testId="playground-script-file-title">{name}</TitleLabel>
      <div className="script-file-editor">
        <CodeEditor
          value={source}
          onChange={handleChange}
          language="javascript"
          hintsFor={['req', 'res', 'bru']}
          height="100%"
          testId="playground-script-file-editor"
        />
      </div>
    </StyledWrapper>
  );
};

export default ScriptFileView;
