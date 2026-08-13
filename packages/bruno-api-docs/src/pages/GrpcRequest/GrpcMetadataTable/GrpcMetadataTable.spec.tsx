import React from 'react';
import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId, query } from '@/test-utils/dom';
import type { GrpcMetadata } from '@opencollection/types/requests/grpc';
import { GrpcMetadataTable } from './GrpcMetadataTable';

const rows = (entries: Record<string, unknown>[]) => entries as unknown as GrpcMetadata[];

const cellTexts = (table: HTMLElement, key: string): string[] =>
  table.querySelectorAll(`[data-testid="table-cell-${key}"]`).map((cell) => cell.text.trim());

describe('GrpcMetadataTable', () => {
  it('renders nothing when there is no metadata', () => {
    const root = useRenderToDom(<GrpcMetadataTable metadata={rows([])} />);
    expect(queryByTestId(root, 'grpc-metadata-table')).toBeNull();
  });

  it('renders a name, value and description for every row', () => {
    const root = useRenderToDom(
      <GrpcMetadataTable
        metadata={rows([
          { name: 'authorization', value: 'Bearer token', description: 'Auth token' },
          { name: 'x-request-id', value: 'req-001' }
        ])}
      />
    );

    const table = getByTestId(root, 'grpc-metadata-table');
    expect(cellTexts(table, 'name')).toEqual(['authorization', 'x-request-id']);
    expect(cellTexts(table, 'value')).toEqual(['Bearer token', 'req-001']);
    expect(cellTexts(table, 'description')).toEqual(['Auth token', '']);
  });

  it('reads a description given as an object', () => {
    const root = useRenderToDom(
      <GrpcMetadataTable metadata={rows([{ name: 'x-client', value: 'Bruno', description: { content: 'Client name' } }])} />
    );

    const table = getByTestId(root, 'grpc-metadata-table');
    expect(cellTexts(table, 'description')).toEqual(['Client name']);
  });

  it('marks a disabled row', () => {
    const root = useRenderToDom(
      <GrpcMetadataTable metadata={rows([{ name: 'x-legacy-flag', value: 'off', disabled: true }])} />
    );

    const table = getByTestId(root, 'grpc-metadata-table');
    expect(cellTexts(table, 'name')).toEqual(['x-legacy-flag']);
    expect(getByTestId(table, 'disabled-badge').text).toBe('Disabled');
  });

  it('highlights a variable in a value', () => {
    const root = useRenderToDom(
      <GrpcMetadataTable metadata={rows([{ name: 'authorization', value: 'Bearer {{token}}' }])} />
    );

    const table = getByTestId(root, 'grpc-metadata-table');
    expect(query(table, '.var-text').text).toContain('token');
  });
});
