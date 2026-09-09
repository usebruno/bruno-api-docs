import '../styles/index.css';
import Prism from '../utils/prism';
import OpenCollectionPlayground from '../components/OpenCollectionPlayground/OpenCollectionPlayground';
import { createRendererClass, type OpenCollectionOptions } from '../renderer';

if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export type { OpenCollectionOptions };

export const OpenCollectionPlaygroundRenderer = createRendererClass(OpenCollectionPlayground);

export default OpenCollectionPlaygroundRenderer;

if (typeof window !== 'undefined') {
  (window as any).OpenCollectionPlayground = OpenCollectionPlaygroundRenderer;
}
