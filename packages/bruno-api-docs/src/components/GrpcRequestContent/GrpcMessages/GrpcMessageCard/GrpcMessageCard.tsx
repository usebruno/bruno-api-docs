import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronArrow } from '../../../ChevronArrow/ChevronArrow';
import { Code } from '../../../Code/Code';
import { StyledWrapper } from './StyledWrapper';

interface GrpcMessageCardProps {
  title: string;
  message: string;
  expanded: boolean;
  onToggle: () => void;
  testId?: string;
}

export const GrpcMessageCard: React.FC<GrpcMessageCardProps> = ({
  title,
  message,
  expanded,
  onToggle,
  testId = 'grpc-message-card'
}) => {
  const [mounted, setMounted] = useState(expanded);
  if (expanded && !mounted) {
    setMounted(true);
  }

  const detailId = useId();
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    if (expanded) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [expanded, mounted]);

  return (
    <StyledWrapper className="grpc-message-card" data-testid={testId}>
      <div className="grpc-message-summary">
        <button
          type="button"
          className="grpc-message-toggle"
          aria-expanded={expanded}
          aria-controls={detailId}
          data-testid={`${testId}-toggle`}
          onClick={onToggle}
        >
          <ChevronArrow open={expanded} size={14} className="grpc-message-chevron" />
          <span className="grpc-message-title" data-testid={`${testId}-title`}>{title}</span>
        </button>
      </div>

      <div ref={detailRef} className={`grpc-message-detail ${expanded ? 'is-open' : ''}`}>
        <div className="grpc-message-detail-clip">
          {mounted && (
            <div className="grpc-message-detail-body" id={detailId}>
              <Code code={message} language="json" showLineNumbers variableAware testId={`${testId}-code`} />
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GrpcMessageCard;
