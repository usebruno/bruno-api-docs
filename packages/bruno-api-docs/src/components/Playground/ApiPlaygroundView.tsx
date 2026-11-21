import React, { Suspense } from 'react';
import { useDocument } from '@usebruno/api-shared/document/document';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { loadPlayground } from './load';
import { retryableLazy } from './retryableLazy';
import PlaygroundLoadError from './PlaygroundLoadError';

const standalonePlayground = retryableLazy(async () => ({ default: (await loadPlayground()).StandalonePlayground }));

const ApiPlaygroundView: React.FC = () => {
  const document = useDocument();
  const StandalonePlayground = standalonePlayground();
  return (
    <ErrorBoundary fallback={<PlaygroundLoadError />} resetKey={document}>
      <Suspense fallback={<div data-testid="playground-loading" />}>
        <StandalonePlayground />
      </Suspense>
    </ErrorBoundary>
  );
};

export default ApiPlaygroundView;
