import { describe, it, expect } from 'vitest';
import { buildGraphqlSnippetBody } from './graphql';

describe('buildGraphqlSnippetBody', () => {
  it('returns undefined when there is no query', () => {
    expect(buildGraphqlSnippetBody('', '')).toBeUndefined();
    expect(buildGraphqlSnippetBody('   ', '{"a":1}')).toBeUndefined();
  });

  it('builds a json body with just the query when there are no variables', () => {
    expect(buildGraphqlSnippetBody('query { me }', '')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }' })
    });
  });

  it('embeds the variables object alongside the query', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{"id":"1"}')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }', variables: { id: '1' } })
    });
  });

  it('embeds variables verbatim so unquoted templates survive (matching the Variables section and the HTTP body path)', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{ "first": {{pageSize}} }')).toEqual({
      type: 'json',
      data: '{"query":"query { me }","variables":{ "first": {{pageSize}} }}'
    });
  });

  it('preserves template variables inside otherwise valid JSON variables', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{"code":"{{countryCode}}"}')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }', variables: { code: '{{countryCode}}' } })
    });
  });
});
