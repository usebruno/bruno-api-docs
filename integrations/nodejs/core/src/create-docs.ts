import { validateOptions, type ApiDocsOptions } from './options';
import type { HttpResponse, Conditional } from './http';
import { log } from './log';
import { providerFor } from './collection';
import { errorProvider, type Provider } from './collection/providers';
import { loadShell, type Shell } from './routes/shell';
import { createHandler, type Handler } from './routes/handler';

export interface Docs {
  handler(): Handler;
  shell(base: string): HttpResponse;
  shellJs(conditional?: Conditional): HttpResponse;
  collection(conditional?: Conditional): HttpResponse;
}

export function createDocs(options: ApiDocsOptions): Docs {
  try {
    validateOptions(options);

    return liveDocs(loadShell(options), providerFor(options));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`${message} — the app will start and the docs mount will serve this`);

    return failedDocs(errorProvider(err));
  }
}

function liveDocs(shell: Shell, provider: Provider): Docs {
  const docs: Docs = {
    shell: (base) => shell.html(base),
    shellJs: (conditional = {}) => shell.js(conditional),
    collection: (conditional = {}) => provider(conditional),
    handler: () => createHandler(docs)
  };

  return docs;
}

function failedDocs(serve: Provider): Docs {
  const docs: Docs = {
    shell: () => serve({}),
    shellJs: () => serve({}),
    collection: () => serve({}),
    handler: () => createHandler(docs)
  };

  return docs;
}
