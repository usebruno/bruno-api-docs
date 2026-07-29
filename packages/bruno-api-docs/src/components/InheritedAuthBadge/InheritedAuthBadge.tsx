import React from 'react';
import { canNavigateToSource, inheritedSourceLabel, type InheritedSource } from '../../utils/request';
import { ContentTypeBadge } from '../ContentTypeBadge/ContentTypeBadge';

interface InheritedAuthBadgeProps {
  source: InheritedSource;
  onNavigate?: (uuid: string) => void;
  testId?: string;
}

export const InheritedAuthBadge: React.FC<InheritedAuthBadgeProps> = ({ source, onNavigate, testId }) => {
  const canNavigate = canNavigateToSource(source, onNavigate);
  const label = inheritedSourceLabel(source);
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
