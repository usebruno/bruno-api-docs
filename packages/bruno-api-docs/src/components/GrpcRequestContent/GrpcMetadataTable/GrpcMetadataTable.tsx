import React from 'react';
import type { GrpcMetadata } from '@opencollection/types/requests/grpc';
import { getDescription } from '../../../utils/request';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { TruncatedText } from '../../TruncatedText/TruncatedText';
import { VariableText } from '../../VariableText/VariableText';
import { DisabledBadge } from '../../DisabledBadge/DisabledBadge';
import { StyledWrapper } from './StyledWrapper';

const COLUMNS: TableColumn[] = [
  { key: 'name', header: 'Name', width: '22%' },
  { key: 'value', header: 'Value', width: '36%' },
  { key: 'description', header: 'Description', width: '42%' }
];

interface GrpcMetadataTableProps {
  metadata: GrpcMetadata[];
  testId?: string;
}

export const GrpcMetadataTable: React.FC<GrpcMetadataTableProps> = ({
  metadata,
  testId = 'grpc-metadata-table'
}) => {
  if (metadata.length === 0) return null;

  return (
    <StyledWrapper>
      <Table
        hideHeader
        columns={COLUMNS}
        testId={testId}
        rows={metadata.map((entry, index) => {
          const description = getDescription(entry);
          return {
            id: `${entry.name}-${index}`,
            cells: {
              name: <TruncatedText text={entry.name} />,
              value: (
                <span className="grpc-metadata-value">
                  <TruncatedText text={entry.value}>
                    <VariableText value={entry.value} />
                  </TruncatedText>
                  {entry.disabled ? <DisabledBadge /> : null}
                </span>
              ),
              description: description ? <TruncatedText text={description} /> : null
            }
          };
        })}
      />
    </StyledWrapper>
  );
};

export default GrpcMetadataTable;
