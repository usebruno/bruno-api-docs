import { test, expect } from '../../playwright';

const GRAPHQL_DETAILS = ['Realtime', 'GraphQL Details'];

test.describe('Request page — GraphQL', () => {
  test.beforeEach(async ({ graphqlRequestPage }) => {
    await graphqlRequestPage.open(GRAPHQL_DETAILS);
  });

  test('shows the GQL badge, the endpoint url and the request name', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.title).toHaveText('GraphQL Details');
    await expect(graphqlRequestPage.urlBar.method).toHaveText('GQL');
    await expect(graphqlRequestPage.urlBar.url).toContainText('api.example.com/graphql');
  });

  test('does not offer a Try button (the interactive playground does not support graphql yet)', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.urlBar.tryButton).toHaveCount(0);
  });

  test('renders a Query section and a Variables section instead of a Body section', async ({ graphqlRequestPage, page }) => {
    await expect(graphqlRequestPage.section('Query')).toBeVisible();
    await expect(graphqlRequestPage.section('Query')).toContainText('country');
    await expect(graphqlRequestPage.section('Variables')).toBeVisible();
    await expect(graphqlRequestPage.section('Variables')).toContainText('countryCode');
    await expect(page.getByTestId('request-section-body')).toHaveCount(0);
  });

  test('reuses the Headers and Auth sections from the request page', async ({ graphqlRequestPage }) => {
    const headers = graphqlRequestPage.section('Headers');
    await expect(headers).toBeVisible();
    await expect(headers.getByText('x-api-key')).toBeVisible();

    const auth = graphqlRequestPage.section('Auth');
    await expect(auth).toBeVisible();
    await expect(auth).toContainText('Basic');
    await expect(auth).toContainText('user@example.com');
  });

  test('builds a GraphQL POST code snippet from the query and variables', async ({ graphqlRequestPage }) => {
    const snippet = graphqlRequestPage.section('Code Snippet');
    await expect(snippet).toBeVisible();
    await expect(snippet).toContainText('graphql');
    await expect(snippet).toContainText('query');
  });

  test('shows the Execution Context section', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.section('Execution Context')).toBeVisible();
  });
});
