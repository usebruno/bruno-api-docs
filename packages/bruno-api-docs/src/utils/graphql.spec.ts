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

  it('embeds parsed variables as an object alongside the query', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{"id":"1"}')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }', variables: { id: '1' } })
    });
  });

  it('omits variables when they are not valid JSON', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{ not json')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }' })
    });
  });

  it('preserves template variables inside otherwise valid JSON variables', () => {
    expect(buildGraphqlSnippetBody('query { me }', '{"code":"{{countryCode}}"}')).toEqual({
      type: 'json',
      data: JSON.stringify({ query: 'query { me }', variables: { code: '{{countryCode}}' } })
    });
  });
});
