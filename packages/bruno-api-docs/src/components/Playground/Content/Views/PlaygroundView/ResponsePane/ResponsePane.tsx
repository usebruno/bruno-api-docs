import React, { useState } from 'react';
import Tabs from '../../../../../../ui/Tabs/Tabs';
import ResponseBodyTab from '../../Common/ResponseBodyTab';
import ResponseHeadersTab from '../../Common/ResponseHeadersTab';
import TestResultsTab from '../../Common/TestResultsTab';
import ErrorBanner from '../../../../../../ui/ErrorBanner/ErrorBanner';
import { SendIconWrapper, StyledWrapper } from './StyledWrapper';
import { SendIcon } from '../../../../../../assets/icons';
import ResponseFormatSelector from './ResponseFormatter/ResponseFormatter';
import { useResponseFormatter } from './ResponseFormatter/hooks/useResponseFormatter';
import type { RunRequestResponse } from '../../../../../../runner';
import type { ResponseBodyFormat } from '../../../../../../constants';


interface ResponsePaneProps {
  response: RunRequestResponse;
  isLoading: boolean;
}

const ResponsePane: React.FC<ResponsePaneProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState('response');
  const {
    selectedFormat,
    showPreview,
    handleFormatChange,
    handleViewChange,
    contentType,
    allowedFormats
  } = useResponseFormatter(response);

  const getStatusColor = (status?: number) => {
    if (!status) return 'var(--oc-request-tab-panel-response-status)';
    if (status >= 200 && status < 300) return 'var(--oc-request-tab-panel-response-ok)';
    if (status >= 300 && status < 400) return 'var(--oc-colors-text-warning)';
    if (status >= 400 && status < 500) return 'var(--oc-request-tab-panel-response-error)';
    if (status >= 500) return 'var(--oc-request-tab-panel-response-error)';
    return 'var(--oc-request-tab-panel-response-status)';
  };

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

  const statusInfo = (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      {activeTab === 'response' && (
        <ResponseFormatSelector
          selectedFormat={selectedFormat}
          allowedFormats={allowedFormats}
          handleSelection={(value: ResponseBodyFormat) => handleFormatChange(value)}
          showPreview={showPreview}
          onPreviewToggle={handleViewChange}
        />
      )}
      <div className="flex items-center gap-2">
        <span className="status-meta-label">Status:</span>
        <span
          className="font-mono font-medium"
          style={{ color: getStatusColor(response.status) }}
        >
          {response.status} {response.statusText}
        </span>
      </div>

      {response.duration && (
        <div className="flex items-center gap-1">
          <span className="status-meta-label">Time:</span>
          <span className="font-mono status-meta-value">
            {response.duration}ms
          </span>
        </div>
      )}

      {response.size && (
        <div className="flex items-center gap-1">
          <span className="status-meta-label">Size:</span>
          <span className="font-mono status-meta-value">
            {(response.size / 1024).toFixed(2)} KB
          </span>
        </div>
      )}
    </div>
  );

  return (
    <StyledWrapper>
      <Tabs
        variant="responsive"
        testId="response-tabs"
        className='h-full'
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightElement={response.error ? undefined : statusInfo}
      />
    </StyledWrapper>
  );
};

export default ResponsePane;
