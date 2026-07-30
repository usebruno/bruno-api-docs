import React, { useState } from 'react';
import Tabs from '@/ui/Tabs/Tabs';
import ResponseBodyTab from '../../Common/ResponseBodyTab';
import ResponseHeadersTab from '../../Common/ResponseHeadersTab';
import TestResultsTab from '../../Common/TestResultsTab';
import ErrorBanner from '@/ui/ErrorBanner/ErrorBanner';
import { SendIconWrapper, StyledWrapper } from './StyledWrapper';
import { SendIcon } from '@/assets/icons';
import ResponseFormatSelector from './ResponseFormatter/ResponseFormatter';
import { useResponseFormatter } from './ResponseFormatter/hooks/useResponseFormatter';
import type { ResponseBodyFormat } from '@/constants';
import ResponseDuration from './ResponseInfo/ResponseDuration/ResponseDuration';
import type { RunRequestResponse } from '@/runner';
import ResponseStatus from './ResponseInfo/ResponseStatus/ResponseStatus';
import ResponseSize from './ResponseInfo/ResponseSize/ResponseSize';
import ResponseActions from './ResponseActions/ResponseActions';
import { RESPONSE_ACTIONS_EXPANDED_WIDTH } from '@/constants/response';

interface ResponsePaneProps {
  response: RunRequestResponse;
  isLoading: boolean;
  orientation: 'vertical' | 'horizontal';
  itemUuid: string;
}

const ResponsePane: React.FC<ResponsePaneProps> = ({ response, isLoading, orientation, itemUuid }) => {
  const [activeTab, setActiveTab] = useState('response');
  const {
    selectedFormat,
    showPreview,
    handleFormatChange,
    toggleView,
    contentType,
    allowedFormats
  } = useResponseFormatter(response);

  // Handle loading, empty, and error states
  if (isLoading) {
    return (
      <StyledWrapper className="flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="loading-text">Sending request...</span>
        </div>
      </StyledWrapper>
    );
  }

  if (!response) {
    return (
      <StyledWrapper className="flex flex-col items-center justify-center">
        <SendIconWrapper className="mb-4 send-icon">
          <SendIcon width={26} height={24} />
        </SendIconWrapper>
        <p className="empty-hint">Click Send to make a request</p>
      </StyledWrapper>
    );
  }

  // A failed request (no HTTP response) renders a danger banner inside the
  // Response tab, keeping the same tab shell as a successful response.
  const renderErrorBanner = () => (
    <div className="p-4">
      <ErrorBanner
        title={response.errorTitle || 'Request Failed'}
        message={response.error ?? ''}
      />
    </div>
  );

  const renderResponseBody = () =>
    response.error ? renderErrorBanner() : (
      <ResponseBodyTab
        response={response}
        selectedFormat={selectedFormat}
        showPreview={showPreview}
        contentType={contentType}
      />
    );
  const renderHeaders = () => <ResponseHeadersTab headers={response.headers} />;
  const renderTestResults = () => (
    <TestResultsTab
      testResults={response.testResults}
      assertionResults={response.assertionResults}
    />
  );

  const headersCount = response.headers ? Object.keys(response.headers).length : 0;
  const hasTestResults = response.testResults && response.testResults.results.length > 0;
  const hasAssertionResults = response.assertionResults && response.assertionResults.results.length > 0;
  const testsCount = hasTestResults || hasAssertionResults ? '•' : undefined;

  const tabs = [
    {
      id: 'response',
      label: 'Response',
      content: renderResponseBody()
    },
    {
      id: 'headers',
      label: 'Headers',
      contentIndicator: headersCount || undefined,
      content: renderHeaders()
    },
    {
      id: 'tests',
      label: 'Tests',
      contentIndicator: testsCount,
      content: renderTestResults()
    }
  ];

  // The status metadata and the actions are separate direct children of the tab bar's right slot so
  // the responsive tab bar can measure the actions block (the last child) to decide whether to show
  // it as inline buttons or collapse it into a menu.
  const statusInfo = (
    <>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {activeTab === 'response' && (
          <ResponseFormatSelector
            selectedFormat={selectedFormat}
            allowedFormats={allowedFormats}
            handleSelection={(value: ResponseBodyFormat) => handleFormatChange(value)}
            showPreview={showPreview}
            toggleView={toggleView}
          />
        )}
        <ResponseStatus status={response.status} statusText={response.statusText} />
        <ResponseDuration duration={response.duration} />
        <ResponseSize size={response.size} />
      </div>
      <ResponseActions
        orientation={orientation}
        itemUuid={itemUuid}
        response={response}
        selectedFormat={selectedFormat}
        showPreview={showPreview}
      />
    </>
  );

  return (
    <StyledWrapper>
      <Tabs
        variant="responsive"
        testId="response-tabs"
        className="h-full"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightElement={response.error ? undefined : statusInfo}
        rightContentExpandedWidth={RESPONSE_ACTIONS_EXPANDED_WIDTH}
      />
    </StyledWrapper>
  );
};

export default ResponsePane;
