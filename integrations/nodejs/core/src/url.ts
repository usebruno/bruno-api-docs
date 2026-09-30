export const stripGitCredentials = (url: string): string => {
  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || (!parsed.username && !parsed.password)) {
      return url;
    }
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
};
