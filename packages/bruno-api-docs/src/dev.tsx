/* eslint-disable react-refresh/only-export-components -- dev-only entry, not a component module */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './styles/index.css';
// Import Prism (with our token customizations) to ensure it's bundled
import Prism from './utils/prism';
import OpenCollection from './components/OpenCollection/OpenCollection';
import { createOpenCollectionStore } from './store/store';
import { sampleCollectionYaml } from './sampleCollection';
import { foldersFixtureCollection } from './e2eFixtures/foldersCollection';
import { variablesFixtureCollection } from './e2eFixtures/variablesCollection';
import { descriptionsFixtureCollection } from './e2eFixtures/descriptionsCollection';
import { qaFixtureCollection } from './e2eFixtures/qaCollection';
import {
  generalFixtureCollection,
  generalLongNameCollection,
  generalNoEnvCollection,
  generalNoVersionCollection,
  generalOneEnvCollection
} from './e2eFixtures/generalCollection';

// Named collections for e2e. An unknown `?fixture=` value renders an error
// instead of silently falling through to the sample collection.
// `?nogit=1` drops the git url so the Open-in-Bruno download modal can be exercised.
const fixtures = {
  'folders': foldersFixtureCollection,
  'vars': variablesFixtureCollection,
  'descriptions': descriptionsFixtureCollection,
  'qa': qaFixtureCollection,
  'general': generalFixtureCollection,
  'general-none': generalNoEnvCollection,
  'general-one': generalOneEnvCollection,
  'general-long': generalLongNameCollection,
  'general-noversion': generalNoVersionCollection
};

const params = new URLSearchParams(window.location.search);
const fixture = params.get('fixture');
const noGit = params.get('nogit') === '1';
const unknownFixture = fixture != null && !(fixture in fixtures);
const devCollection = unknownFixture || fixture == null
  ? sampleCollectionYaml
  : fixtures[fixture as keyof typeof fixtures];

// Ensure Prism is available globally for any code that might access it
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

// Development App component
const DevApp: React.FC = () => {
  const store = createOpenCollectionStore();

  if (unknownFixture) {
    return (
      <div data-testid="unknown-fixture">
        {`Unknown fixture "${fixture}". Expected one of: ${Object.keys(fixtures).join(', ')}`}
      </div>
    );
  }

  return (
    <Provider store={store}>
      <div style={{ height: '100vh', width: '100vw' }}>
        <OpenCollection
          collection={devCollection}
          gitCollectionUrl={noGit ? undefined : 'https://github.com/usebruno/bruno-testbench.git'}
        />
      </div>
    </Provider>
  );
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DevApp />);
} else {
  console.error('Root container not found');
}
