import React from 'react';
import type { InheritedSource } from '../../utils/request';
import { ContentTypeBadge } from '../ContentTypeBadge/ContentTypeBadge';

interface InheritedAuthBadgeProps {
  source: InheritedSource;
  onNavigate?: (uuid: string) => void;
  testId?: string;
}

/**
 * The inherited-auth chip: "Inherited from {collection|folder}: {name}", naming the nearest
 * configured parent and clickable to navigate to it. The title mirrors the label so the full
 * name still surfaces on hover if the chip is clipped. Shared by the request Auth section and
 * the folder Auth group so they stay identical.
 */
export const InheritedAuthBadge: React.FC<InheritedAuthBadgeProps> = ({ source, onNavigate, testId }) => {
  const canNavigate = Boolean(onNavigate && source.uuid);
  const label = `Inherited from ${source.level}: ${source.name}`;
  return (
    <ContentTypeBadge
      label={label}
      title={label}
      onClick={canNavigate ? () => onNavigate!(source.uuid) : undefined}
      testId={testId}
    />
  );
};

export default InheritedAuthBadge;
