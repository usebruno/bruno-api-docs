import type { ServerResponse } from 'node:http';
import { Module, type DynamicModule, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { createDocs, embed, type ApiDocsOptions, type Request } from '@usebruno/api-docs-core';

export { createDocs, embed };
export type { ApiDocsOptions, CollectionOptions, RendererOptions, EmbedOptions, EnvironmentsOption, TagsOption }
  from '@usebruno/api-docs-core';

export interface ApiDocsModuleOptions extends ApiDocsOptions {
  /** Where the docs mount. Nest gives no way to mount a module from outside, so it is an option. */
  mountPath?: string;
}

const DEFAULT_MOUNT_PATH = '/docs';

/** Searched for, not stripped: `setGlobalPrefix('api')` moves a `/docs` mount to `/api/docs`. */
export function subPathOf(fullUrl: string, mountPath: string): string {
  const at = fullUrl.indexOf(mountPath);
  if (at === -1) {
    return fullUrl;
  }

  return fullUrl.slice(at + mountPath.length) || '/';
}

/** `ApiDocsModule.forRoot({ collection: './api-collection', mountPath: '/docs' })`. */
export class ApiDocsModule {
  static forRoot(options: ApiDocsModuleOptions): DynamicModule {
    const { mountPath: mountOption, ...docsOptions } = options;
    const mountPath = (mountOption ?? DEFAULT_MOUNT_PATH).replace(/\/+$/, '');
    const handler = createDocs(docsOptions).handler();

    @Module({})
    class ApiDocsHostModule implements NestModule {
      configure(consumer: MiddlewareConsumer): void {
        consumer
          .apply((req: Request, res: ServerResponse) => {
            const originalUrl = req.originalUrl ?? req.url ?? '/';
            const url = subPathOf(originalUrl, mountPath);
            handler({ method: req.method, url, originalUrl, headers: req.headers }, res);
          })
          // the mount alone is enough on platform-express, which matches by prefix. On
          // platform-fastify it matches only the mount itself, so the wildcard is what serves
          // shell.js and every deep link. `*` is understood by Nest 10 and 11 alike.
          .forRoutes(mountPath, `${mountPath}/*`);
      }
    }

    return { module: ApiDocsHostModule };
  }
}
