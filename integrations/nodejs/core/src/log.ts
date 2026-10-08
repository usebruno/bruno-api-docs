const line = (message: string): string => `[bruno-docs] ${message}`;

export const log = {
  info: (message: string): void => console.log(line(message)),
  warn: (message: string): void => console.warn(line(message)),
  error: (message: string): void => console.error(line(message))
};
