/**
 * Builds the Fetch-in-Bruno URL: a normal https link to the Bruno fetch service,
 * carrying the collection's git remote as `?url=`. The service decides whether to
 * open the installed desktop app or offer a download, so it works whether or not
 * Bruno is installed (no fragile `bruno://` protocol launch from here).
 *
 * Pure + framework-agnostic so it can be unit tested and reused by any CTA.
 * Returns `undefined` when there is no usable git URL, letting callers omit the
 * link (render a disabled / hidden CTA) instead of producing a dead href.
 */
export const buildFetchInBrunoUrl = (gitUrl?: string | null): string | undefined => {
  const trimmed = gitUrl?.trim();
  if (!trimmed) {
    return undefined;
  }
  return `https://fetch.usebruno.com?url=${encodeURIComponent(trimmed)}`;
};
