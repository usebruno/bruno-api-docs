import React from 'react';

const PlaygroundLoadError: React.FC = () => (
  <div
    data-testid="playground-load-error"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 16,
      textAlign: 'center',
      color: 'var(--text-secondary)',
      fontSize: 13
    }}
  >
    The playground failed to load in this environment.
  </div>
);

export default PlaygroundLoadError;
