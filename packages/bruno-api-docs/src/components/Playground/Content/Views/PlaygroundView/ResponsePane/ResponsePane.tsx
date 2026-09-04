import React, { useState } from 'react';
import Tabs from '@/ui/Tabs/Tabs';
import ResponseBodyTab from '../../Common/ResponseBodyTab';
import ResponseHeadersTab from '../../Common/ResponseHeadersTab';
import TestResultsTab from '../../Common/TestResultsTab';
import ErrorBanner from '@/ui/ErrorBanner/ErrorBanner';
import WarningBanner from '@/ui/WarningBanner/WarningBanner';
import { SendIconWrapper, StyledWrapper } from './StyledWrapper';
import { SendIcon } from '@/assets/icons';
import ResponseFormatSelector from './ResponseFormatter/ResponseFormatter';
import { useResponseFormatter } from './ResponseFormatter/hooks/useResponseFormatter';
import type { ResponseBodyFormat } from '@/constants';
import ResponseDuration from './ResponseInfo/ResponseDuration/ResponseDuration';
import type { RunRequestResponse } from '@/runner';
import { SCRIPT_ERROR_TITLES } from '@/runner/utils/script-errors';
import ResponseStatus from './ResponseInfo/ResponseStatus/ResponseStatus';
import ResponseSize from './ResponseInfo/ResponseSize/ResponseSize';
import ResponseActions from './ResponseActions/ResponseActions';
import useResponseActions from './ResponseActions/hooks/useResponseActions';

interface ResponsePaneProps {
  response: RunRequestResponse;
  isLoading: boolean;
  orientation: 'vertical' | 'horizontal';
  itemUuid: string;
}

const ResponsePane: React.FC<ResponsePaneProps> = ({ response, isLoading, orientation, itemUuid }) => {
  const [activeTab, setActiveTab] = useState('response');
  const [dismissedScriptErrorsRequestId, setDismissedScriptErrorsRequestId] = useState<string | undefined>();
  const { actionsExpandedWidth, measureActions } = useResponseActions();

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
    <div className="pb-4">
      <ErrorBanner
        title={response.errorTitle || 'Request Failed'}
        message={response.error ?? ''}
      />
    </div>
  );

  const scriptErrorsDismissed = dismissedScriptErrorsRequestId === response.requestId;
  const scriptErrors = scriptErrorsDismissed ? [] : (response.scriptErrors ?? []);
  const renderScriptErrors = (testId: string) =>
    scriptErrors.length ? (
      <div className="pb-4 space-y-3" data-testid={testId}>
        {scriptErrors.map((scriptError) => (
          <ErrorBanner
            key={scriptError.phase}
            title={SCRIPT_ERROR_TITLES[scriptError.phase]}
            message={scriptError.message}
            onDismiss={() => setDismissedScriptErrorsRequestId(response.requestId)}
          />
        ))}
      </div>
    ) : null;

  const renderResponseBody = () => (
    <div className="flex flex-col h-full">
      {renderScriptErrors('response-script-errors')}
      {response.warnings?.length ? (
        <div className="pb-4">
          <WarningBanner warnings={response.warnings} />
        </div>
      ) : null}
      {response.error ? renderErrorBanner() : (
        <ResponseBodyTab
          response={response}
          selectedFormat={selectedFormat}
          showPreview={showPreview}
          contentType={contentType}
        />
      )}
    </div>
  );
  const renderHeaders = () => <ResponseHeadersTab headers={response.headers} />;
  const renderTestResults = () => (
    <div className="flex flex-col h-full">
      {renderScriptErrors('tests-script-errors')}
      <TestResultsTab
        testResults={response.testResults}
        assertionResults={response.assertionResults}
      />
    </div>
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

  // MUST stay a fragment: the format selector, status metadata, and actions have to be *direct*
  // children of the tab bar's right slot. The responsive tab bar measures the leading children live
  // and swaps in a supplied width only for the actions (the last child) to choose inline buttons vs.
  // a collapsed menu. Wrapping these in a container collapses them into one child, so that model
  // discards the format/status widths and the actions stop collapsing (see useResponsiveTabs). To
  // adjust spacing between the groups, set `.tabs-right { gap }` in this pane's StyledWrapper.
  const statusInfo = (
    <>
      {activeTab === 'response' && (
        <ResponseFormatSelector
          selectedFormat={selectedFormat}
          allowedFormats={allowedFormats}
          handleSelection={(value: ResponseBodyFormat) => handleFormatChange(value)}
          showPreview={showPreview}
          toggleView={toggleView}
        />
      )}
      <div className="flex items-center gap-2 flex-wrap text-xs">
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
      {!response.error && (
        <div className="response-actions-measure" aria-hidden="true" ref={measureActions} inert>
          <ResponseActions
            renderActionButtonsOnly
            orientation={orientation}
            itemUuid={itemUuid}
            response={response}
            selectedFormat={selectedFormat}
            showPreview={showPreview}
          />
        </div>
      )}
      <Tabs
        variant="responsive"
        testId="response-tabs"
        className="h-full"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightElement={response.error ? undefined : statusInfo}
        rightContentExpandedWidth={actionsExpandedWidth}
      />

    </StyledWrapper>
  );
};

export default ResponsePane;
