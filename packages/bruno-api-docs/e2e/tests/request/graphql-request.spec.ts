import { test, expect } from '../../playwright';

const GRAPHQL_DETAILS = ['Realtime', 'GraphQL Details'];

test.describe('Request page — GraphQL', () => {
  test.beforeEach(async ({ graphqlRequestPage }) => {
    await graphqlRequestPage.open(GRAPHQL_DETAILS);
  });

  test('shows the POST method, the endpoint url and the request name', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.title).toHaveText('GraphQL Details');
    await expect(graphqlRequestPage.urlBar.method).toHaveText('POST');
    await expect(graphqlRequestPage.urlBar.url).toContainText('api.example.com/graphql');
  });

  test('shows the breadcrumb with the parent folder and the current request', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.breadcrumb.current).toHaveText('GraphQL Details');
    await expect(graphqlRequestPage.breadcrumb.segment('Realtime')).toBeVisible();
  });

  test('does not offer a Try button (the interactive playground does not support graphql yet)', async ({ graphqlRequestPage }) => {
    await expect(graphqlRequestPage.urlBar.tryButton).toHaveCount(0);
  });

  test('renders the GraphQL query and variables instead of a Body section', async ({ graphqlRequestPage, page }) => {
    await expect(graphqlRequestPage.query).toBeVisible();
    await expect(graphqlRequestPage.query).toContainText('country');
    await expect(graphqlRequestPage.variables).toBeVisible();
    await expect(graphqlRequestPage.variables).toContainText('countryCode');
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
    await expect(graphqlRequestPage.codeSnippet.code).toContainText('graphql');
    await expect(graphqlRequestPage.codeSnippet.code).toContainText('query');
  });

  test('shows the Execution Context variables, including set-variable actions', async ({ graphqlRequestPage }) => {
    await graphqlRequestPage.executionContext.openTab('variables');
    await expect(graphqlRequestPage.executionContext.variable('countryCode')).toBeVisible();
    await expect(graphqlRequestPage.executionContext.variable('countryName')).toBeVisible();
  });

  test('renders the request description and no Params section for a request without params', async ({ graphqlRequestPage, page }) => {
    await expect(graphqlRequestPage.description).toBeVisible();
    await expect(graphqlRequestPage.description).toContainText('country');
    await expect(page.getByTestId('request-section-params')).toHaveCount(0);
  });
});
