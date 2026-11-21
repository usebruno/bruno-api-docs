import StandalonePlayground from './components/Playground/StandalonePlayground/StandalonePlayground';
import { mountApiPlayground, type ApiPlaygroundOptions } from '@usebruno/api-shared/utils/standalone';

const globals = window as unknown as { Bruno?: Record<string, unknown> };
globals.Bruno = {
  ...globals.Bruno,
  build: __BRUNO_BUILD__,
  apiPlayground: (target: HTMLElement, options: ApiPlaygroundOptions) =>
    mountApiPlayground(target, options, StandalonePlayground)
};
