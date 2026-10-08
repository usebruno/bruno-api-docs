import React from 'react';
import InitialsAvatar from '../../InitialsAvatar/InitialsAvatar';
import TruncatedText from '../../TruncatedText/TruncatedText';
import { StyledWrapper } from './StyledWrapper';

export interface BrandProps {
  collectionName: string;
  version?: string;
  logo?: React.ReactNode;
  compact?: boolean;
  testId?: string;
}

const PRODUCT_LABEL = 'Docs';

const renderLogo = (logo: React.ReactNode, collectionName: string): React.ReactNode => {
  if (typeof logo === 'string') {
    return <img src={logo} alt={`${collectionName} logo`} />;
  }
  return logo;
};

const Brand: React.FC<BrandProps> = ({
  collectionName,
  version,
  logo,
  compact = false,
  testId = 'brand'
}) => {
  const hasLogo = logo != null && logo !== '';
  return (
    <StyledWrapper className="topbar-brand" data-testid={testId}>
      <span className="topbar-brand-logo">
        {hasLogo ? renderLogo(logo, collectionName) : <InitialsAvatar collectionName={collectionName} />}
      </span>
      {compact ? (
        <span className="topbar-brand-name" data-testid={`${testId}-name`}>{PRODUCT_LABEL}</span>
      ) : (
        <span className="topbar-brand-text">
          <TruncatedText text={collectionName} className="topbar-brand-name" testId={`${testId}-name`} />
          {version && (
            <span className="topbar-brand-version" data-testid={`${testId}-version`}>
              {`Version : ${version}`}
            </span>
          )}
        </span>
      )}
    </StyledWrapper>
  );
};

export default Brand;
