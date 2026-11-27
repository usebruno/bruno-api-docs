import React, { useCallback, useState } from 'react';
import KeyValueTable, { type KeyValueRow, type KeyValueRowConfig } from '@/components/KeyValueTable/KeyValueTable';
import { InheritedSourceLink } from '@/components/InheritedSourceLink/InheritedSourceLink';
import { ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeOffIcon } from '@/assets/icons';
import { useSessionStorage } from '@/hooks';
import { STANDARD_HTTP_HEADERS, MIME_TYPES } from '@/constants/httpHeaders';
import { HEADER_NAME_REGEX, HEADER_VALUE_REGEX } from '@/constants/regex';
import { getDescription, type InheritedHeaderRow as InheritedHeader, type InheritedSource } from '@/utils/request';
import BulkEdit from '../BulkEdit/BulkEdit';
import { StyledWrapper } from './StyledWrapper';

const ROW_TYPE = {
  INHERITED: 'inherited',
  SECTION: 'section'
} as const;

type RequestHeaderRow = KeyValueRow & { rowType?: undefined };

interface InheritedHeaderTableRow extends KeyValueRow {
  description?: string;
  rowType: typeof ROW_TYPE.INHERITED;
  source?: InheritedSource;
};

type HeaderSection = 'inherited' | 'request';

interface SectionHeaderRow extends KeyValueRow {
  name: '';
  value: '';
  enabled: true;
  rowType: typeof ROW_TYPE.SECTION;
  section: HeaderSection;
  label: string;
  expanded: boolean;
};

type HeaderTableRow = RequestHeaderRow | InheritedHeaderTableRow | SectionHeaderRow;

const isRequestRow = (row: HeaderTableRow): row is RequestHeaderRow => !row.rowType;

interface HeadersTabProps {
  headers: Array<{ name?: string; value?: string; disabled?: boolean; description?: unknown }>;
  onHeadersChange: (headers: KeyValueRow[]) => void;
  title?: string;
  description?: string;
  inheritedHeaders?: InheritedHeader[];
  onNavigateToSource?: (uuid: string) => void;
}

const getHeaderError = (row: HeaderTableRow, _index: number, field: 'name' | 'value'): string | null => {
  if (field === 'name') {
    if (!row.name || row.name.trim() === '') return null;
    if (!HEADER_NAME_REGEX.test(row.name)) return 'Header name cannot contain spaces or newlines';
  }
  if (field === 'value') {
    if (!row.value) return null;
    if (!HEADER_VALUE_REGEX.test(row.value)) return 'Header value cannot contain newlines';
  }
  return null;
};

const createSectionRow = (section: HeaderSection, label: string, expanded: boolean): SectionHeaderRow => ({
  id: `${section}-headers-section`,
  name: '',
  value: '',
  enabled: true,
  rowType: ROW_TYPE.SECTION,
  section,
  label,
  expanded
});

const inheritedRow = (header: InheritedHeader): InheritedHeaderTableRow => ({
  id: `inherited-header-${header.source?.uuid ?? ''}-${header.name}`,
  name: header.name,
  value: header.value ?? '',
  enabled: !header.disabled,
  description: getDescription(header),
  rowType: ROW_TYPE.INHERITED,
  source: header.source
});

const HeadersDisplay: React.FC<Omit<HeadersTabProps, 'title' | 'description'>> = ({
  headers,
  onHeadersChange,
  inheritedHeaders = [],
  onNavigateToSource
}) => {
  const [showKeyValueTable, setShowKeyValueTable] = useState(true);
  const [showAdditionalHeaders, setShowAdditionalHeaders] = useSessionStorage(
    'oc-docs:playgroundShowAdditionalHeaders',
    false
  );
  const [isInheritedSectionExpanded, setIsInheritedSectionExpanded] = useState(true);
  const [isRequestSectionExpanded, setIsRequestSectionExpanded] = useState(true);
  const headersData: RequestHeaderRow[] = (headers || []).map((header, index) => ({
    id: `header-${index}`,
    name: header.name || '',
    value: header.value || '',
    enabled: header.disabled !== true,
    description: getDescription(header)
  }));

  const hasInheritedHeaders = inheritedHeaders.length > 0;
  const displayGroupedTable = hasInheritedHeaders && showAdditionalHeaders;

  const tableRows: HeaderTableRow[] = displayGroupedTable
    ? [
        createSectionRow('inherited', 'Inherited Headers', isInheritedSectionExpanded),
        ...(isInheritedSectionExpanded ? inheritedHeaders.map(inheritedRow) : []),
        createSectionRow('request', `Request Headers (${headersData.length})`, isRequestSectionExpanded),
        ...(isRequestSectionExpanded ? headersData : [])
      ]
    : headersData;

  const toggleBulkEditView = useCallback(() => {
    setShowKeyValueTable((prev) => !prev);
  }, [setShowKeyValueTable]);

  const toggleAdditionalHeaders = () => {
    if (!showAdditionalHeaders) setIsInheritedSectionExpanded(true);
    setShowAdditionalHeaders(!showAdditionalHeaders);
  };

  const handleTableChange = (rows: HeaderTableRow[]) => onHeadersChange(rows.filter(isRequestRow));

  const rowConfig: KeyValueRowConfig<HeaderTableRow> = {
    isEditable: isRequestRow,
    isCheckboxDisabled: (row) => row.rowType === ROW_TYPE.INHERITED,
    className: (row) => (row.rowType ? `${row.rowType}-header-row` : ''),
    testId: (row) => {
      if (row.rowType === ROW_TYPE.SECTION) return `${row.section}-headers-section-row`;
      if (row.rowType === ROW_TYPE.INHERITED) return `inherited-header-row-${row.name.toLowerCase()}`;
      return row.name ? `request-header-row-${row.name.toLowerCase()}` : 'request-header-add-row';
    },
    renderFullWidth: (row) => {
      if (row.rowType !== ROW_TYPE.SECTION) return null;
      const toggle = row.section === 'inherited'
        ? () => setIsInheritedSectionExpanded((prev) => !prev)
        : () => setIsRequestSectionExpanded((prev) => !prev);
      return (
        <button
          type="button"
          className="headers-section-toggle"
          data-testid={`${row.section}-headers-section-toggle`}
          aria-expanded={row.expanded}
          onClick={toggle}
        >
          {row.expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <span>{row.label}</span>
        </button>
      );
    },
    renderActionCell: (row) => {
      if (row.rowType !== ROW_TYPE.INHERITED || !row.source) return null;
      return (
        <InheritedSourceLink
          source={row.source}
          itemName={row.name}
          onNavigate={onNavigateToSource}
          testId={`inherited-header-source-${row.name.toLowerCase()}`}
        />
      );
    }
  };

  return (
    <>
      {showKeyValueTable ? (
        <KeyValueTable
          data={tableRows}
          onChange={handleTableChange}
          keyPlaceholder="Name"
          valuePlaceholder="Value"
          showEnabled={true}
          inlineActions={true}
          keyAutocomplete={STANDARD_HTTP_HEADERS}
          valueAutocomplete={MIME_TYPES}
          getRowError={getHeaderError}
          showDescription
          disableNewRow={displayGroupedTable && !isRequestSectionExpanded}
          rowConfig={rowConfig}
        />
      ) : (
        <BulkEdit data={headersData} onChange={onHeadersChange} idPrefix="header" />
      )}
      <div className="flex items-center justify-between mt-2">
        <div>
          {hasInheritedHeaders && showKeyValueTable && (
            <button
              type="button"
              className="toggle-inherited-headers select-none"
              data-testid="toggle-inherited-headers"
              aria-pressed={showAdditionalHeaders}
              onClick={toggleAdditionalHeaders}
            >
              {showAdditionalHeaders ? <EyeOffIcon /> : <EyeIcon />}
              <span>
                {showAdditionalHeaders
                  ? 'Hide Additional Headers'
                  : `Show Additional Headers (${inheritedHeaders.length})`}
              </span>
            </button>
          )}
        </div>
        <button
          className="bulk-edit-toggle text-link select-none"
          data-testid="bulk-edit-toggle"
          onClick={toggleBulkEditView}
        >
          {showKeyValueTable ? 'Bulk edit' : 'Key/Value edit'}
        </button>
      </div>
    </>
  );
};

export const HeadersTab: React.FC<HeadersTabProps> = ({
  headers,
  onHeadersChange,
  title,
  description,
  inheritedHeaders,
  onNavigateToSource
}) => {
  return (
    <StyledWrapper className="space-y-3">
      {(Boolean(title) || Boolean(description)) && (
        <div className="flex items-center justify-between mb-4">
          {title && <span className="title text-sm font-semibold">{title}</span>}
          {description && <span className="description text-xs leading-tight">{description}</span>}
        </div>
      )}
      <HeadersDisplay
        headers={headers}
        onHeadersChange={onHeadersChange}
        inheritedHeaders={inheritedHeaders}
        onNavigateToSource={onNavigateToSource}
      />
    </StyledWrapper>
  );
};

export default HeadersTab;
