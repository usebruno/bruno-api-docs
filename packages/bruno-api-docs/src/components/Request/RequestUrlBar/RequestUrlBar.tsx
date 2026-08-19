import React from 'react';
import cx from '@/utils/cx';
import { MethodBadge } from '../../MethodBadge/MethodBadge';
import { VariableText } from '../../VariableText/VariableText';
import { CopyButton } from '@/ui/CopyButton/CopyButton';
import { TruncatedText } from '../../TruncatedText/TruncatedText';
import { useResolvedVariables } from '@/hooks/useVariableResolver';
import { SendIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

interface RequestUrlBarProps {
  method: string;
  capitalizeMethod?: boolean;
  url: string;
  onTry?: () => void;
  tryLabel?: string;
  style?: React.CSSProperties;
  className?: string;
  testId?: string;
}

export const RequestUrlBar: React.FC<RequestUrlBarProps> = ({
  method,
  capitalizeMethod = true,
  url,
  onTry,
  tryLabel = 'Try',
  style,
  className,
  testId = 'request-url-bar'
}) => {
  const { resolve } = useResolvedVariables();
  return (
    <StyledWrapper style={style} className={cx('request-url-bar', className)} data-testid={testId}>
      <span className="request-url-bar-method" data-testid="request-method">
        <MethodBadge method={method} capitalizeMethod={capitalizeMethod} />
      </span>
      <TruncatedText className="request-url-bar-url" testId="request-url" text={url}>
        <VariableText value={url} />
      </TruncatedText>
      <span className="request-url-bar-actions">
        <CopyButton text={resolve(url)} label="Copy URL" />
        {onTry && (
          <button type="button" className="request-try" onClick={onTry} data-testid="request-try-button">
            <SendIcon />
            {tryLabel}
          </button>
        )}
      </span>
    </StyledWrapper>
  );
};

export default RequestUrlBar;
