import React from 'react';
import type { InheritedSource } from '../../utils/request';
import { ContentTypeBadge } from '../ContentTypeBadge/ContentTypeBadge';

interface InheritedAuthBadgeProps {
  source: InheritedSource;
  onNavigate?: (uuid: string) => void;
  testId?: string;
}

/**
 * The inherited-auth chip: "Inherited from {collection|folder}", clickable to navigate to that
 * nearest configured parent (a tooltip names the specific parent). Shared by the request Auth
 * section and the folder Auth group so they stay identical.
 */
export const InheritedAuthBadge: React.FC<InheritedAuthBadgeProps> = ({ source, onNavigate, testId }) => {
  const canNavigate = Boolean(onNavigate && source.uuid);
  return (
    <ContentTypeBadge
      label={`Inherited from ${source.level}`}
      title={`Inherited from ${source.level}: ${source.name}`}
      onClick={canNavigate ? () => onNavigate!(source.uuid) : undefined}
      testId={testId}
    />
  );
};

export default InheritedAuthBadge;
