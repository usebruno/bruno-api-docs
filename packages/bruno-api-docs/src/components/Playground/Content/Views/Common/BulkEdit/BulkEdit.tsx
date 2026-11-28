import React, { useEffect, useRef, useState } from 'react';
import CodeEditor from '@/ui/CodeEditor/CodeEditor';
import type { KeyValueRow } from '@/components/KeyValueTable/KeyValueTable';
import { parseBulkKeyValue, preserveDescriptions, serializeBulkKeyValue } from '@/utils/bulkKeyValue';
import { StyledWrapper } from './StyledWrapper';

export interface BulkEditProps {
  data: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  idPrefix?: string;
}

const BulkEdit: React.FC<BulkEditProps> = ({ data, onChange, idPrefix }) => {
  const originalRef = useRef(data);
  const [text, setText] = useState(() => serializeBulkKeyValue(data));

  useEffect(() => {
    const incoming = serializeBulkKeyValue(data);
    setText((current) => {
      if (incoming === serializeBulkKeyValue(parseBulkKeyValue(current))) return current;
      originalRef.current = data;
      return incoming;
    });
  }, [data]);

  const handleChange = (value: string) => {
    setText(value);
    onChange(preserveDescriptions(parseBulkKeyValue(value), originalRef.current, idPrefix ?? 'row'));
  };

  return (
    <StyledWrapper className="space-y-3">
      <CodeEditor
        value={text}
        onChange={handleChange}
        language="plaintext"
        height="200px"
        placeholder="name: value"
        testId={idPrefix ? `${idPrefix}-bulk-editor` : 'bulk-editor'}
      />
    </StyledWrapper>
  );
};

export default BulkEdit;
