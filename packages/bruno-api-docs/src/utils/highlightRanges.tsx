import React from 'react';

/**
 * Bold the `ranges` (inclusive [start, end] pairs) inside `text`, so
 * each field advertises the exact substring that matched. The mark keeps the
 * field's own colour (weight is the only highlight signal). No ranges leaves
 * the text plain.
 */
export const highlightRanges = (text: string, ranges?: Array<[number, number]>): React.ReactNode => {
  if (!ranges || ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <b className="search-hl" data-testid="search-highlight" key={i}>
        {text.slice(start, end + 1)}
      </b>
    );
    cursor = end + 1;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
};
