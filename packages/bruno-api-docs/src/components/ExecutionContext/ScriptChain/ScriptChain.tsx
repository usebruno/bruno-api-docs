import React, { useMemo } from 'react';
import { VariableText } from '../../VariableText/VariableText';
import { ScriptStep } from '../ScriptStep/ScriptStep';
import type { ScriptChainStep, ScriptFlow } from '../../../utils/request';
import { StyledWrapper } from './StyledWrapper';

interface ScriptChainProps {
  steps: ScriptChainStep[];
  flow: ScriptFlow;
  requestLabel?: string;
  url?: string;
  onNavigate?: (uuid: string) => void;
}

const RequestMarker: React.FC<{ position: number; label: string; url?: string }> = ({ position, label, url }) => (
  <div className="script-row">
    <div className="script-line script-http">
      <span className="step-num">{position}</span>
      <span aria-hidden="true" />
      <span className="script-http-main">
        <span className="script-http-label" data-testid="script-chain-request-label">{label}</span>
        {url && (
          <span className="script-http-url">
            <VariableText value={url} />
          </span>
        )}
      </span>
      <span aria-hidden="true" />
    </div>
  </div>
);

export const ScriptChain: React.FC<ScriptChainProps> = ({ steps, flow, requestLabel = 'HTTP', url, onNavigate }) => {
  const { pre, post } = useMemo(() => {
    const byOrderAsc = (a: ScriptChainStep, b: ScriptChainStep) => a.order - b.order;
    const pre = steps.filter((s) => s.phase === 'before-request').sort(byOrderAsc);
    const postAsc = steps.filter((s) => s.phase === 'after-response').sort(byOrderAsc);
    const post = flow === 'sequential' ? postAsc : [...postAsc].reverse();
    return { pre, post };
  }, [steps, flow]);

  if (steps.length === 0) return null;

  let position = 0;
  const next = (): number => (position += 1);

  return (
    <StyledWrapper>
      {pre.map((step, index) => (
        <ScriptStep key={`pre-${step.order}-${index}`} step={step} position={next()} onNavigate={onNavigate} />
      ))}
      <RequestMarker position={next()} label={requestLabel} url={url} />
      {post.map((step, index) => (
        <ScriptStep key={`post-${step.order}-${index}`} step={step} position={next()} onNavigate={onNavigate} />
      ))}
    </StyledWrapper>
  );
};

export default ScriptChain;
