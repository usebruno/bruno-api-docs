import React, { useState } from 'react';
import type { GrpcMessageEntry } from '../../../utils/schemaHelpers';
import { GrpcMessageCard } from './GrpcMessageCard/GrpcMessageCard';
import { StyledWrapper } from './StyledWrapper';

const COLLAPSED_COUNT = 3;

interface GrpcMessagesProps {
  messages: GrpcMessageEntry[];
  testId?: string;
}

export const GrpcMessages: React.FC<GrpcMessagesProps> = ({ messages, testId = 'grpc-messages' }) => {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(() => new Set([0]));
  const [showAll, setShowAll] = useState(false);

  if (messages.length === 0) return null;

  const visible = showAll ? messages : messages.slice(0, COLLAPSED_COUNT);
  const hasOverflow = messages.length > COLLAPSED_COUNT;

  const toggle = (index: number) => {
    setExpandedIndexes((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <StyledWrapper className="grpc-messages" data-testid={testId}>
      {visible.map((entry, index) => (
        <GrpcMessageCard
          key={`${entry.title}-${index}`}
          title={entry.title}
          message={entry.message}
          expanded={expandedIndexes.has(index)}
          onToggle={() => toggle(index)}
          testId={`${testId}-card-${index}`}
        />
      ))}

      {hasOverflow && (
        <button
          type="button"
          className="grpc-messages-show-toggle"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
          data-testid={`${testId}-show-toggle`}
        >
          <span>{showAll ? 'Show less' : 'Show more'}</span>
          <svg
            className="grpc-messages-show-chevron"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </StyledWrapper>
  );
};

export default GrpcMessages;
