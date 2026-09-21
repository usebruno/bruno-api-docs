import type { FastifyPluginAsync, FastifyReply, RegisterOptions } from 'fastify';
import { createDocs, embed, type ApiDocsOptions, type HttpResponse } from '@usebruno/api-docs-core';

export { createDocs, embed };
export type { ApiDocsOptions, CollectionOptions, CollectionFilters, Filter, RendererOptions, EmbedOptions }
  from '@usebruno/api-docs-core';

/** `hide` is @fastify/swagger's, read at runtime, and Fastify's own FastifySchema omits it. */
declare module 'fastify' {
  interface FastifySchema {
    hide?: boolean;
  }
}

const send = (reply: FastifyReply, response: HttpResponse): FastifyReply => {
  reply.code(response.status).headers(response.headers);

  return response.body === null ? reply.send() : reply.send(response.body);
};

/**
 * `app.register(apiDocs, { collection: './api-collection', prefix: '/docs' })`. The mount is
 * Fastify's own `prefix`, so there is no `mountPath`. Deliberately not wrapped in `fastify-plugin`:
 * staying encapsulated is what keeps the 405 off the host's routes and lets an adopter put auth in
 * front with `child.addHook('onRequest', ...)`.
 */
export const apiDocs: FastifyPluginAsync<ApiDocsOptions> = async (fastify, options) => {
  // Fastify hands its own register options (prefix, logLevel, ...) to the plugin with ours
  const { prefix: _prefix, logLevel: _logLevel, logSerializers: _logSerializers, ...docsOptions }
    = options as ApiDocsOptions & RegisterOptions;
  const docs = createDocs(docsOptions);
  const base = `${fastify.prefix}/`;
  const lastSegment = fastify.prefix.split('/').filter(Boolean).pop() ?? '';
  const hide = { schema: { hide: true } };

  // no-slash, or this route claims `/docs/` too and the page below never answers
  fastify.get('/', { ...hide, prefixTrailingSlash: 'no-slash' }, (request, reply) =>
    reply.code(301).header('location', `${lastSegment}/`).send());

  fastify.get('/shell.js', hide, (request, reply) =>
    send(reply, docs.shellJs({ ifNoneMatch: request.headers['if-none-match'] })));

  fastify.get('/collection.yml', hide, (request, reply) =>
    send(reply, docs.collection({ ifNoneMatch: request.headers['if-none-match'] })));

  fastify.get('/*', hide, (request, reply) => send(reply, docs.shell(base)));

  // a matched path with an unmatched method arrives here, which is where 405 belongs
  fastify.setNotFoundHandler((request, reply) =>
    reply.code(405).header('allow', 'GET, HEAD').send());
};
