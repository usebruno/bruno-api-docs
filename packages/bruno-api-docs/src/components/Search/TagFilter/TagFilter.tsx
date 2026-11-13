import React from 'react';
import { TagIcon } from '@usebruno/api-shared/assets/icons';
import Dropdown from '@/ui/Dropdown/Dropdown';

interface TagFilterProps {
  tags: string[];
  /** Currently selected tags; empty set means no tag filter is active. */
  selected: Set<string>;
  onToggle: (tag: string) => void;
  testId?: string;
}

const triggerLabel = (selected: Set<string>): string => {
  if (selected.size === 0) return 'Tags';
  if (selected.size === 1) return [...selected][0];
  return `${selected.size} tags`;
};

/** Multi-select tag filter for the search palette, built on the shared
 * Dropdown. Options toggle without closing the menu, so several tags can be
 * picked in one visit. Renders nothing when the collection has no tags. */
export const TagFilter: React.FC<TagFilterProps> = ({ tags, selected, onToggle, testId = 'search-tag-filter' }) => {
  if (tags.length === 0) return null;

  return (
    <Dropdown label={triggerLabel(selected)} active={selected.size > 0} menuLabel="Filter by tags" multiselect testId={testId}>
      {() =>
        tags.map((tag) => (
          <li key={tag} role="option" aria-selected={selected.has(tag)}>
            <button
              type="button"
              className={`dropdown-option${selected.has(tag) ? ' is-selected' : ''}`}
              onClick={() => onToggle(tag)}
            >
              <TagIcon />
              <span className="dropdown-label">{tag}</span>
            </button>
          </li>
        ))}
    </Dropdown>
  );
};

export default TagFilter;
