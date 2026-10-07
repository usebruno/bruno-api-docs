import React, { useId, useMemo, useState } from 'react';
import type { WebSocketMessageType } from '@opencollection/types/requests/websocket';
import cx from '@/utils/cx';
import { prefersReducedMotion } from '@/utils/motion';
import { prettifyJsonString, prettifyXmlString } from '@/utils/dataFormatter';
import { BODY_LANGUAGE, WEBSOCKET_MESSAGE_TYPE_LABELS } from '@/constants';
import { ChevronArrow } from '@/components/ChevronArrow/ChevronArrow';
import { ContentTypeBadge } from '@/components/ContentTypeBadge/ContentTypeBadge';
import { Code } from '@/components/Code/Code';
import { StyledWrapper } from './StyledWrapper';

const prettify = (type: WebSocketMessageType, data: string): string => {
  if (type === 'json') return prettifyJsonString(data);
  if (type === 'xml') return prettifyXmlString(data);
  return data;
};

interface WebsocketMessageCardProps {
  title: string;
  type: WebSocketMessageType;
  data: string;
  expanded: boolean;
  onToggle: () => void;
  testId?: string;
}

export const WebsocketMessageCard: React.FC<WebsocketMessageCardProps> = ({
  title,
  type,
  data,
  expanded,
  onToggle,
  testId = 'websocket-message-card'
}) => {
  const [collapsing, setCollapsing] = useState(false);
  const detailId = useId();
  const code = useMemo(() => prettify(type, data), [type, data]);

  const isOpen = expanded && !collapsing;

  const finishCollapse = () => {
    setCollapsing(false);
    onToggle();
  };

  const handleToggle = () => {
    if (collapsing) {
      setCollapsing(false);
      return;
    }
    if (!expanded || prefersReducedMotion()) {
      onToggle();
      return;
    }
    setCollapsing(true);
  };

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (!collapsing) return;
    if (event.propertyName !== 'grid-template-rows') return;
    if (event.target !== event.currentTarget) return;
    finishCollapse();
  };

  return (
    <StyledWrapper className="websocket-message-card" data-testid={testId}>
      <div className="websocket-message-summary">
        <button
          type="button"
          className="websocket-message-toggle"
          aria-expanded={isOpen}
          aria-controls={detailId}
          data-testid={`${testId}-toggle`}
          onClick={handleToggle}
        >
          <ChevronArrow open={isOpen} size={14} className="websocket-message-chevron" />
          <span className="websocket-message-title" data-testid={`${testId}-title`}>{title}</span>
        </button>
        <ContentTypeBadge label={WEBSOCKET_MESSAGE_TYPE_LABELS[type] ?? type} testId={`${testId}-type`} />
      </div>

      <div className={cx('websocket-message-detail', { 'is-open': isOpen })} onTransitionEnd={handleTransitionEnd}>
        <div className="websocket-message-detail-clip">
          {expanded && (
            <div className="websocket-message-detail-body" id={detailId}>
              <Code
                code={code}
                language={BODY_LANGUAGE[type] ?? 'text'}
                showLineNumbers
                variableAware
                testId={`${testId}-code`}
              />
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WebsocketMessageCard;
