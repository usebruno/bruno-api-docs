import './styles/index.css';
// Import Prism (with our token customizations) to ensure it's bundled
import Prism from './utils/prism';
import OpenCollection from './components/OpenCollection/OpenCollection';
import { createRendererClass, type OpenCollectionOptions } from './renderer';

// Ensure Prism is available globally for any code that might access it
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export type { OpenCollectionOptions };

export const OpenCollectionRenderer = createRendererClass(OpenCollection);

export default OpenCollectionRenderer;

if (typeof window !== 'undefined') {
  (window as any).OpenCollection = OpenCollectionRenderer;
}
