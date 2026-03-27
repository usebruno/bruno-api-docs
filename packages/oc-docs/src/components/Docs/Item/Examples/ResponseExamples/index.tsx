import React, { useState, useMemo, useEffect } from 'react';
import type { HttpRequestExample } from '@opencollection/types/requests/http';
import StyledWrapper from './StyledWrapper';

interface ResponseExamplesProps {
  examples: HttpRequestExample[];
  activeExampleName?: string | null;
  onExampleChange?: (name: string | null) => void;
}

interface GroupedExamples {
  [status: number]: HttpRequestExample[];
}

export const ResponseExamples: React.FC<ResponseExamplesProps> = ({
  examples,
  activeExampleName,
  onExampleChange
}) => {
  // Filter examples that have response data
  const responseExamples = useMemo(() =>
    examples.filter(ex => ex.response),
    [examples]
  );

  // Group examples by status code
  const groupedByStatus = useMemo(() => {
    const grouped: GroupedExamples = {};
    responseExamples.forEach(ex => {
      const status = ex.response?.status || 0;
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(ex);
    });
    return grouped;
  }, [responseExamples]);

  const statusCodes = useMemo(() =>
    Object.keys(groupedByStatus).map(Number).sort((a, b) => a - b),
    [groupedByStatus]
  );

  const [activeStatus, setActiveStatus] = useState<number>(statusCodes[0] || 0);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

  // Sync with activeExampleName from parent
  useEffect(() => {
    if (activeExampleName) {
      // Find the example by name
      const example = responseExamples.find(ex => ex.name === activeExampleName);
      if (example) {
        const status = example.response?.status || 0;
        const examplesForStatus = groupedByStatus[status] || [];
        const indexInGroup = examplesForStatus.findIndex(ex => ex.name === activeExampleName);
        if (indexInGroup >= 0) {
          setActiveStatus(status);
          setActiveExampleIndex(indexInGroup);
          setActiveTab('body');
        }
      }
    }
  }, [activeExampleName, responseExamples, groupedByStatus]);

  if (responseExamples.length === 0 || statusCodes.length === 0) return null;

  const currentExamples = groupedByStatus[activeStatus] || [];
  const activeExample = currentExamples[activeExampleIndex];
  const response = activeExample?.response;
  const hasHeaders = response?.headers && response.headers.length > 0;
  const hasBody = response?.body?.data;
  const hasMultipleExamples = currentExamples.length > 1;

  const formatJson = (data: string): string => {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  const handleStatusChange = (status: number) => {
    setActiveStatus(status);
    setActiveExampleIndex(0);
    setActiveTab('body');
    // Notify parent of the first example in this status group
    const firstExample = groupedByStatus[status]?.[0];
    if (onExampleChange && firstExample) {
      onExampleChange(firstExample.name || null);
    }
  };

  const handleExampleIndexChange = (index: number) => {
    setActiveExampleIndex(index);
    setActiveTab('body');
    // Notify parent of the selected example
    const example = currentExamples[index];
    if (onExampleChange && example) {
      onExampleChange(example.name || null);
    }
  };

  return (
    <StyledWrapper>
      <h3 className="examples-title">Response Examples</h3>
      <div className="examples-container">
        {/* Status code tabs with controls on right */}
        <div className="status-tabs">
          <div className="status-tabs-left">
            {statusCodes.map(status => (
              <button
                key={status}
                className={`status-tab ${activeStatus === status ? 'active' : ''}`}
                onClick={() => handleStatusChange(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="right-controls">
            {/* Body/Headers toggle */}
            {hasHeaders && (
              <div className="content-toggle">
                <button
                  className={`toggle-btn ${activeTab === 'body' ? 'active' : ''}`}
                  onClick={() => setActiveTab('body')}
                >
                  Body
                </button>
                <button
                  className={`toggle-btn ${activeTab === 'headers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('headers')}
                >
                  Headers
                </button>
              </div>
            )}

            {/* Example selector - consistent appearance */}
            {hasMultipleExamples ? (
              <select
                className="example-select"
                value={activeExampleIndex}
                onChange={(e) => handleExampleIndexChange(Number(e.target.value))}
              >
                {currentExamples.map((ex, idx) => (
                  <option key={idx} value={idx}>
                    {ex.name || `Example ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="example-select single">
                {activeExample?.name || 'Example'}
              </span>
            )}
          </div>
        </div>

        {response && (
          <div className="example-content">
            {/* Body tab content */}
            {activeTab === 'body' && (
              <div>
                {hasBody ? (
                  <div className="body-content">
                    <pre>{formatJson(response.body?.data || '')}</pre>
                  </div>
                ) : (
                  <div className="no-content">No body content</div>
                )}
              </div>
            )}

            {/* Headers tab content */}
            {activeTab === 'headers' && hasHeaders && (
              <div>
                <table className="headers-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.headers?.map((header, idx) => (
                      <tr key={idx}>
                        <td>{header.name}</td>
                        <td>{header.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!response && (
          <div className="no-content">No response example available</div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default ResponseExamples;
