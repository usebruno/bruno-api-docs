import React from 'react';
import type { HttpRequestExample } from '@opencollection/types/requests/http';
import StyledWrapper from './StyledWrapper';

interface RequestExamplesProps {
  examples: HttpRequestExample[];
  activeExampleName?: string | null;
  onExampleChange?: (name: string | null) => void;
}

export const RequestExamples: React.FC<RequestExamplesProps> = ({
  examples,
  activeExampleName,
  onExampleChange
}) => {
  // Filter examples that have request data
  const requestExamples = examples.filter(ex => ex.request?.body);

  if (requestExamples.length === 0) return null;

  // Find active index based on name, or default to 0
  const activeIndex = activeExampleName
    ? Math.max(0, requestExamples.findIndex(ex => ex.name === activeExampleName))
    : 0;

  const activeExample = requestExamples[activeIndex];

  const handleExampleChange = (index: number) => {
    const example = requestExamples[index];
    if (onExampleChange && example) {
      onExampleChange(example.name || null);
    }
  };

  const formatBody = (body: any): string => {
    if (!body?.data) return '';
    const data = body.data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <StyledWrapper>
      <h3 className="section-title">Request Examples</h3>
      <div className="examples-container">
        {requestExamples.length > 1 && (
          <div className="example-tabs">
            {requestExamples.map((example, index) => (
              <button
                key={index}
                className={`example-tab ${activeIndex === index ? 'active' : ''}`}
                onClick={() => handleExampleChange(index)}
              >
                {example.name || `Example ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="example-content">
          {activeExample.request?.body ? (
            <div className="body-content">
              <pre>{formatBody(activeExample.request.body)}</pre>
            </div>
          ) : (
            <div className="no-content">No request body</div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default RequestExamples;
