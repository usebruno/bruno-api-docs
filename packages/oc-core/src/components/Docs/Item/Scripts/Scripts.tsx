import React from 'react';
import { TabGroup, CompactCodeView } from '../../../../ui/MinimalComponents';
import { StyledWrapper } from './StyledWrapper';

interface ScriptsProps {
  preRequest?: string | null;
  postResponse?: string | null;
}

export const Scripts: React.FC<ScriptsProps> = ({
  preRequest,
  postResponse
}) => {
  const hasPre = Boolean(preRequest);
  const hasPost = Boolean(postResponse);

  if (!hasPre && !hasPost) {
    return null;
  }

  const defaultTab = hasPre ? 'pre' : 'post';

  return (
    <StyledWrapper>
      <div className="scripts-section">
        <h3 className="section-title">Scripts</h3>
        <div className="scripts-card">
          <TabGroup
            tabs={[
              { id: 'pre', label: 'Pre-request' },
              { id: 'post', label: 'Post-response' }
            ]}
            defaultTab={defaultTab}
            renderContent={(activeTab: string) => {
              const isPre = activeTab === 'pre';
              const label = isPre ? 'Pre-request' : 'Post-response';
              const code = isPre ? preRequest : postResponse;

              return (
                <CompactCodeView
                  title={label}
                  code={code || ''}
                  language="javascript"
                />
              );
            }}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};


