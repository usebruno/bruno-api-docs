import React, { useState } from 'react';
import type { WebSocketMessageEntry } from '@/utils/schemaHelpers';
import { WebsocketMessageCard } from './WebsocketMessageCard/WebsocketMessageCard';
import { ExpandToggle } from '@/components/ExpandToggle/ExpandToggle';

const COLLAPSED_COUNT = 3;

interface WebsocketMessagesProps {
  messages: WebSocketMessageEntry[];
  testId?: string;
}

export const WebsocketMessages: React.FC<WebsocketMessagesProps> = ({ messages, testId = 'websocket-messages' }) => {
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
    <div className="websocket-messages" data-testid={testId}>
      {visible.map((entry, index) => (
        <WebsocketMessageCard
          key={`${entry.title}-${index}`}
          title={entry.title}
          type={entry.type}
          data={entry.data}
          expanded={expandedIndexes.has(index)}
          onToggle={() => toggle(index)}
          testId={`${testId}-card-${index}`}
        />
      ))}

      {hasOverflow && (
        <ExpandToggle
          expanded={showAll}
          moreLabel="Show more"
          lessLabel="Show less"
          onToggle={() => setShowAll((value) => !value)}
          className="mt-3"
          testId={`${testId}-show-toggle`}
        />
      )}
    </div>
  );
};

export default WebsocketMessages;
