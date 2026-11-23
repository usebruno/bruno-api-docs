import React from 'react';
import { TagIcon } from '@usebruno/api-shared/assets/icons';
import { StyledWrapper } from './StyledWrapper';

interface TagsProps {
  tags: string[];
  inheritedTags?: string[];
  className?: string;
  testId?: string;
}

/** Chip list for an item's tags. Renders nothing when there are none. */
export const Tags: React.FC<TagsProps> = ({ tags, inheritedTags = [], className, testId = 'tags' }) => {
  if (tags.length === 0 && inheritedTags.length === 0) return null;

  return (
    <StyledWrapper className={className} data-testid={testId}>
      {tags.map((tag) => (
        <span key={tag} className="tag-chip" data-testid={`${testId}-chip`}>
          <TagIcon />
          <span className="tag-chip-label">{tag}</span>
        </span>
      ))}
      {inheritedTags.map((tag) => (
        <span key={tag} className="tag-chip is-inherited" data-testid={`${testId}-inherited-chip`}>
          <TagIcon />
          <span className="tag-chip-label">{tag}</span>
        </span>
      ))}
    </StyledWrapper>
  );
};

export default Tags;
