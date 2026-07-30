import React from 'react';
import { getMethodColorVar } from '../../../theme/methodColors';
import { getShortMethod } from '../../../utils/request';
import { FolderIcon } from '../../../assets/icons';
import { Tooltip } from '../../../ui/Tooltip/Tooltip';
import { requestCountLabel } from '../../../utils/folder';
import { formatBreadcrumb, type SearchRecord, type FieldMatches } from '../searchIndex';
import { StyledWrapper } from './StyledWrapper';

interface SearchResultItemProps {
  record: SearchRecord;
  /** Matched character ranges per field, so each field bolds what matched. */
  matches?: FieldMatches;
  /** Whether this row is the active (keyboard-highlighted) result. */
  active?: boolean;
  /** Navigate to this result (caller also closes the palette). */
  onSelect: (record: SearchRecord) => void;
  testId?: string;
}

const TOOLTIP_DELAY_MS = 500;

/**
 * Whether the row cut the text off to fit. Both the name and the chain shrink
 * to share one line, so either can end in a CSS ellipsis at a width no static
 * rule can predict — only the laid-out node knows.
 */
const isClipped = (el: HTMLElement): boolean => el.scrollWidth > el.clientWidth + 1;

/**
 * Bold the `ranges` (inclusive [start, end] pairs from Fuse) inside `text`, so
 * each field advertises the exact substring that matched. The mark keeps the
 * field's own colour (weight is the only highlight signal). No ranges leaves
 * the text plain.
 */
const highlightRanges = (text: string, ranges?: Array<[number, number]>): React.ReactNode => {
  if (!ranges || ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <b className="search-hl" key={i}>
        {text.slice(start, end + 1)}
      </b>
    );
    cursor = end + 1;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
};

/**
 * One result row in the search palette, in a request or a folder variant.
 *
 * A request leads with its method as a plain colour-coded mono label (not the
 * filled sidebar badge) while still sourcing its colour from the shared
 * `getMethodColorVar` token, so methods stay consistent app-wide. A folder
 * leads with a folder glyph in that same slot and counts its requests rather
 * than showing a url — it is not an endpoint. The glyph is decorative, so the
 * folder variant names its kind in text for screen readers.
 *
 * Both variants show the same breadcrumb: same-named folders in different
 * branches are otherwise indistinguishable. The name takes the room it needs
 * and the chain yields, capped so it can never crowd the name out.
 *
 * A tooltip appears only where text was actually cut — by eliding the middle
 * of a long chain, or by the row running out of width. Text shown whole gets
 * no bubble, since it would only repeat what is already on screen.
 */
export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  record,
  matches,
  active = false,
  onSelect,
  testId = 'search-result'
}) => {
  const { full: fullBreadcrumb, display: breadcrumb } = formatBreadcrumb(record.ancestorNames);
  const isElided = breadcrumb !== fullBreadcrumb;

  // The anchor is a plain span inside the row button, so it never takes focus
  // and the tooltip alone would leave the hidden folders unreachable. Naming
  // the node wins over its text when the button's name is computed.
  const breadcrumbNode = breadcrumb ? (
    <span
      className="search-result-breadcrumb"
      data-testid={`${testId}-breadcrumb`}
      aria-label={isElided ? fullBreadcrumb : undefined}
    >
      {breadcrumb}
    </span>
  ) : null;

  return (
    <StyledWrapper type="button" data-active={active} data-testid={testId} onClick={() => onSelect(record)}>
      {record.type === 'folder' ? (
        <span className="search-result-icon" data-testid={`${testId}-folder-icon`}>
          <FolderIcon />
        </span>
      ) : (
        record.method && (
          <span
            className="search-result-method"
            data-testid={`${testId}-method`}
            style={{ ['--method-color' as string]: getMethodColorVar(record.method) }}
          >
            {getShortMethod(record.method)}
          </span>
        )
      )}
      <span className="search-result-body">
        <span className="search-result-title-row">
          <Tooltip
            content={record.name}
            shouldOpen={isClipped}
            openDelay={TOOLTIP_DELAY_MS}
            testId={`${testId}-name-tooltip`}
          >
            <span className="search-result-name" data-testid={`${testId}-name`}>
              {record.type === 'folder' && <span className="search-result-kind">Folder: </span>}
              {highlightRanges(record.name, matches?.name)}
            </span>
          </Tooltip>
          {breadcrumbNode && (
            <Tooltip
              content={fullBreadcrumb}
              shouldOpen={(el) => isElided || isClipped(el)}
              openDelay={TOOLTIP_DELAY_MS}
              testId={`${testId}-breadcrumb-tooltip`}
            >
              {breadcrumbNode}
            </Tooltip>
          )}
        </span>
        {record.type === 'folder' ? (
          <span className="search-result-count">{requestCountLabel(record.requestCount)}</span>
        ) : (
          record.url && <span className="search-result-url">{highlightRanges(record.url, matches?.url)}</span>
        )}
      </span>
    </StyledWrapper>
  );
};

export default SearchResultItem;
