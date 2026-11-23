import React from 'react';
import { useEnvState, useSession } from '@usebruno/api-shared/session/session';
import { Tooltip } from '@usebruno/api-shared/ui/Tooltip/Tooltip';
import { StyledWrapper } from './StyledWrapper';

export interface ShowVarsToggleProps {
  testId?: string;
}

/**
 * Placement-agnostic show-variables toggle. Bound to the instance's
 * `showVars` flag in the session env, so it flips the same state from any
 * container alongside the environment switcher.
 */
const ShowVarsToggle: React.FC<ShowVarsToggleProps> = ({ testId = 'show-vars-toggle' }) => {
  const { env } = useSession();
  const { showVars } = useEnvState();

  return (
    <Tooltip content="Show resolved variable values" touch={false} testId={`${testId}-tooltip`}>
      <StyledWrapper
        role="switch"
        data-testid={testId}
        aria-checked={showVars}
        aria-label="Show variables"
        onClick={env.toggleShowVars}
      >
        <span className="show-vars-track" aria-hidden="true">
          <span className="show-vars-thumb" />
        </span>
        <span className="show-vars-label">Show vars</span>
      </StyledWrapper>
    </Tooltip>
  );
};

export default ShowVarsToggle;
