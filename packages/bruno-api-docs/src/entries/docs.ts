import '../styles/index.css';
import Prism from '../utils/prism';
import OpenCollectionDocs from '../components/OpenCollectionDocs/OpenCollectionDocs';
import { createRendererClass, type OpenCollectionOptions } from '../renderer';

if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export type { OpenCollectionOptions };

export const OpenCollectionDocsRenderer = createRendererClass(OpenCollectionDocs);

export default OpenCollectionDocsRenderer;

if (typeof window !== 'undefined') {
  (window as any).OpenCollectionDocs = OpenCollectionDocsRenderer;
}
