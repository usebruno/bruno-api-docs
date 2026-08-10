const unsupportedMessage = (api: string): string =>
  `${api} is not currently supported in the Bruno playground. Please use the Bruno desktop app.`;

export const addUnsupportedWarning = (warnings: string[] | undefined, api: string): void => {
  if (!warnings) return;
  const message = unsupportedMessage(api);
  if (!warnings.includes(message)) {
    warnings.push(message);
  }
};
